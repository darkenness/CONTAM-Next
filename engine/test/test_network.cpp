#include <gtest/gtest.h>
#include "core/Node.h"
#include "core/Link.h"
#include "core/Network.h"
#include "elements/PowerLawOrifice.h"
#include "utils/Constants.h"
#include <cmath>

using namespace contam;

TEST(NodeTest, BasicProperties) {
    Node node(1, "Room1", NodeType::Normal);
    EXPECT_EQ(node.getId(), 1);
    EXPECT_EQ(node.getName(), "Room1");
    EXPECT_EQ(node.getType(), NodeType::Normal);
    EXPECT_FALSE(node.isKnownPressure());
}

TEST(NodeTest, AmbientNodeIsKnownPressure) {
    Node node(0, "Outdoor", NodeType::Ambient);
    EXPECT_TRUE(node.isKnownPressure());
}

TEST(NodeTest, DensityCalculation) {
    Node node(1, "Room1");
    node.setTemperature(293.15);  // 20°C
    node.setPressure(0.0);        // atmospheric
    node.updateDensity();

    // ρ = P_atm / (R_air * T) = 101325 / (287.055 * 293.15)
    double expected = P_ATM / (R_AIR * 293.15);
    EXPECT_NEAR(node.getDensity(), expected, 1e-6);
    EXPECT_NEAR(node.getDensity(), 1.204, 0.01);  // ~1.204 kg/m^3 at 20°C
}

TEST(NodeTest, DensityVariesWithTemperature) {
    Node cold(1, "Cold");
    cold.setTemperature(273.15);  // 0°C
    cold.updateDensity();

    Node hot(2, "Hot");
    hot.setTemperature(313.15);   // 40°C
    hot.updateDensity();

    EXPECT_GT(cold.getDensity(), hot.getDensity());
}

TEST(NetworkTest, AddAndRetrieveNodes) {
    Network net;
    net.addNode(Node(1, "Room1"));
    net.addNode(Node(2, "Room2"));
    net.addNode(Node(0, "Outdoor", NodeType::Ambient));

    EXPECT_EQ(net.getNodeCount(), 3);
    EXPECT_EQ(net.getUnknownCount(), 2);  // Room1 + Room2
    EXPECT_EQ(net.getNodeIndexById(2), 1);
}

TEST(NetworkTest, ThreeRoomTopology) {
    Network net;

    // Outdoor (ambient)
    Node outdoor(0, "Outdoor", NodeType::Ambient);
    outdoor.setTemperature(283.15);  // 10°C outside
    net.addNode(outdoor);

    // Room 1
    Node room1(1, "Room1");
    room1.setTemperature(293.15);  // 20°C
    room1.setVolume(50.0);
    net.addNode(room1);

    // Room 2
    Node room2(2, "Room2");
    room2.setTemperature(293.15);
    room2.setVolume(40.0);
    net.addNode(room2);

    // Link: Outdoor -> Room1 (window crack)
    Link link1(1, 0, 1, 1.5);  // at 1.5m height
    link1.setFlowElement(std::make_unique<PowerLawOrifice>(0.001, 0.65));
    net.addLink(std::move(link1));

    // Link: Room1 -> Room2 (door)
    Link link2(2, 1, 2, 1.0);  // at 1.0m height
    link2.setFlowElement(std::make_unique<PowerLawOrifice>(0.005, 0.5));
    net.addLink(std::move(link2));

    EXPECT_EQ(net.getNodeCount(), 3);
    EXPECT_EQ(net.getLinkCount(), 2);
    EXPECT_EQ(net.getUnknownCount(), 2);
}
