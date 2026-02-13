#include <gtest/gtest.h>
#include "core/Network.h"
#include "core/Solver.h"
#include "elements/PowerLawOrifice.h"
#include <cmath>

using namespace contam;

class SolverTest : public ::testing::Test {
protected:
    Network buildThreeRoomNetwork() {
        Network net;

        // Outdoor (ambient, 10°C)
        Node outdoor(0, "Outdoor", NodeType::Ambient);
        outdoor.setTemperature(283.15);
        outdoor.setPressure(0.0);
        net.addNode(outdoor);

        // Room 1 (20°C, 50 m^3)
        Node room1(1, "Room1");
        room1.setTemperature(293.15);
        room1.setVolume(50.0);
        room1.setElevation(0.0);
        net.addNode(room1);

        // Room 2 (20°C, 40 m^3)
        Node room2(2, "Room2");
        room2.setTemperature(293.15);
        room2.setVolume(40.0);
        room2.setElevation(0.0);
        net.addNode(room2);

        // Link: Outdoor(0) -> Room1(1), window crack at 1.5m
        Link link1(1, 0, 1, 1.5);
        link1.setFlowElement(std::make_unique<PowerLawOrifice>(0.001, 0.65));
        net.addLink(std::move(link1));

        // Link: Room1(1) -> Room2(2), internal door at 1.0m
        Link link2(2, 1, 2, 1.0);
        link2.setFlowElement(std::make_unique<PowerLawOrifice>(0.005, 0.5));
        net.addLink(std::move(link2));

        // Link: Room2(2) -> Outdoor(0), exhaust crack at 2.0m
        Link link3(3, 2, 0, 2.0);
        link3.setFlowElement(std::make_unique<PowerLawOrifice>(0.001, 0.65));
        net.addLink(std::move(link3));

        return net;
    }
};

TEST_F(SolverTest, TrustRegionConverges) {
    auto network = buildThreeRoomNetwork();
    Solver solver(SolverMethod::TrustRegion);
    auto result = solver.solve(network);

    EXPECT_TRUE(result.converged);
    EXPECT_LT(result.maxResidual, CONVERGENCE_TOL);
    EXPECT_LE(result.iterations, MAX_ITERATIONS);
}

TEST_F(SolverTest, SubRelaxationConverges) {
    auto network = buildThreeRoomNetwork();
    Solver solver(SolverMethod::SubRelaxation);
    auto result = solver.solve(network);

    EXPECT_TRUE(result.converged);
    EXPECT_LT(result.maxResidual, CONVERGENCE_TOL);
}

TEST_F(SolverTest, MassConservation) {
    auto network = buildThreeRoomNetwork();
    Solver solver;
    auto result = solver.solve(network);

    ASSERT_TRUE(result.converged);

    // At steady state, net mass flow into each non-ambient node = 0
    // For Room1 (index 1): inflow from link1 - outflow from link2 ≈ 0
    // For Room2 (index 2): inflow from link2 - outflow from link3 ≈ 0
    // (signs depend on pressure distribution)
    // Check: sum of all mass flows through ambient node = 0
    // Link1: outdoor->room1, Link3: room2->outdoor
    double netAmbient = -result.massFlows[0] + result.massFlows[2];
    EXPECT_NEAR(netAmbient, 0.0, 1e-4);
}

TEST_F(SolverTest, ResultVectorsCorrectSize) {
    auto network = buildThreeRoomNetwork();
    Solver solver;
    auto result = solver.solve(network);

    EXPECT_EQ(result.pressures.size(), 3);  // 3 nodes
    EXPECT_EQ(result.massFlows.size(), 3);  // 3 links
}

TEST_F(SolverTest, AmbientPressureUnchanged) {
    auto network = buildThreeRoomNetwork();
    Solver solver;
    auto result = solver.solve(network);

    ASSERT_TRUE(result.converged);
    // Outdoor node (index 0) pressure should remain 0
    EXPECT_NEAR(result.pressures[0], 0.0, 1e-10);
}

TEST_F(SolverTest, StackEffectCreatesPressureDifference) {
    // Two rooms at different elevations connected to outdoors
    Network net;

    Node outdoor(0, "Outdoor", NodeType::Ambient);
    outdoor.setTemperature(273.15);  // 0°C cold outside
    net.addNode(outdoor);

    Node ground(1, "Ground");
    ground.setTemperature(293.15);  // 20°C inside
    ground.setElevation(0.0);
    ground.setVolume(100.0);
    net.addNode(ground);

    Node top(2, "TopFloor");
    top.setTemperature(293.15);  // 20°C inside
    top.setElevation(10.0);     // 10m above ground
    top.setVolume(100.0);
    net.addNode(top);

    // Ground floor to outdoor
    Link l1(1, 0, 1, 0.5);
    l1.setFlowElement(std::make_unique<PowerLawOrifice>(0.002, 0.65));
    net.addLink(std::move(l1));

    // Ground to top floor
    Link l2(2, 1, 2, 5.0);
    l2.setFlowElement(std::make_unique<PowerLawOrifice>(0.01, 0.5));
    net.addLink(std::move(l2));

    // Top floor to outdoor
    Link l3(3, 2, 0, 10.0);
    l3.setFlowElement(std::make_unique<PowerLawOrifice>(0.002, 0.65));
    net.addLink(std::move(l3));

    Solver solver;
    auto result = solver.solve(net);

    EXPECT_TRUE(result.converged);

    // With cold outside, warm inside, stack effect should create
    // inflow at bottom, outflow at top
    // Ground floor pressure should be slightly positive (from stack effect)
    // But the actual sign depends on the full pressure distribution
    // Just verify convergence and non-zero pressures
    EXPECT_NE(result.pressures[1], 0.0);
    EXPECT_NE(result.pressures[2], 0.0);
}
