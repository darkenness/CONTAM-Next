#include <gtest/gtest.h>
#include "control/Sensor.h"
#include "control/Controller.h"
#include "control/Actuator.h"
#include "core/Network.h"
#include "core/Solver.h"
#include "core/TransientSimulation.h"
#include "core/Occupant.h"
#include "elements/PowerLawOrifice.h"
#include "elements/Damper.h"
#include <cmath>
#include <memory>

using namespace contam;

// ── Controller Unit Tests ────────────────────────────────────────────

TEST(ControllerTest, IncrementalPI_ProportionalOnly) {
    Controller ctrl(0, "P-ctrl", 0, 0, 100.0, 1.0, 0.0);
    // setpoint=100, Kp=1, Ki=0, initial output=0, prevError=0
    // Step 1: sensor=80, error=20
    //   increment = 1.0*(20-0) + 0*(20+0) = 20
    //   rawOutput = 0 + 20 = 20, clamped to 1.0
    double out = ctrl.update(80.0, 1.0);
    EXPECT_DOUBLE_EQ(out, 1.0);

    // Step 2: sensor=80 again, error=20, prevError=20
    //   increment = 1.0*(20-20) + 0*(20+20) = 0
    //   rawOutput = 1.0 + 0 = 1.0
    out = ctrl.update(80.0, 1.0);
    EXPECT_DOUBLE_EQ(out, 1.0);
}

TEST(ControllerTest, IncrementalPI_WithIntegral) {
    Controller ctrl(0, "PI-ctrl", 0, 0, 1.0, 0.5, 0.1);
    // setpoint=1.0, Kp=0.5, Ki=0.1
    // Initial: output=0, prevError=0

    // Step 1: sensor=0.8, error=0.2, prevError=0
    //   increment = 0.5*(0.2-0) + 0.1*(0.2+0) = 0.1 + 0.02 = 0.12
    //   output = 0 + 0.12 = 0.12
    double out = ctrl.update(0.8, 1.0);
    EXPECT_NEAR(out, 0.12, 1e-10);

    // Step 2: sensor=0.9, error=0.1, prevError=0.2
    //   increment = 0.5*(0.1-0.2) + 0.1*(0.1+0.2) = -0.05 + 0.03 = -0.02
    //   output = 0.12 + (-0.02) = 0.10
    out = ctrl.update(0.9, 1.0);
    EXPECT_NEAR(out, 0.10, 1e-10);

    // Step 3: sensor=0.95, error=0.05, prevError=0.1
    //   increment = 0.5*(0.05-0.1) + 0.1*(0.05+0.1) = -0.025 + 0.015 = -0.01
    //   output = 0.10 + (-0.01) = 0.09
    out = ctrl.update(0.95, 1.0);
    EXPECT_NEAR(out, 0.09, 1e-10);
}

TEST(ControllerTest, IncrementalPI_Deadband) {
    Controller ctrl(0, "DB-ctrl", 0, 0, 100.0, 1.0, 0.0, 5.0);
    // deadband=5, setpoint=100

    // sensor=97, error=3, within deadband -> treated as 0
    // increment = 1.0*(0-0) = 0, output stays 0
    double out = ctrl.update(97.0, 1.0);
    EXPECT_DOUBLE_EQ(out, 0.0);

    // sensor=90, error=10, outside deadband
    // increment = 1.0*(10-0) = 10, output = 0+10 = 10, clamped to 1.0
    out = ctrl.update(90.0, 1.0);
    EXPECT_DOUBLE_EQ(out, 1.0);
}

TEST(ControllerTest, IncrementalPI_OutputClamping) {
    Controller ctrl(0, "clamp", 0, 0, 100.0, 10.0, 0.0);
    // Large gain, error=100
    // increment = 10*(100-0) = 1000, output = 0+1000 = 1000, clamped to 1.0
    double out = ctrl.update(0.0, 1.0);
    EXPECT_DOUBLE_EQ(out, 1.0);

    // Now sensor overshoots: sensor=200, error=-100, prevError=100
    // increment = 10*(-100-100) = -2000, output = 1.0+(-2000), clamped to 0
    out = ctrl.update(200.0, 1.0);
    EXPECT_DOUBLE_EQ(out, 0.0);
}

TEST(ControllerTest, IncrementalPI_Reset) {
    Controller ctrl(0, "reset", 0, 0, 1.0, 0.5, 0.1);
    ctrl.update(0.5, 1.0);
    ctrl.update(0.7, 1.0);
    EXPECT_NE(ctrl.output, 0.0);
    ctrl.reset();
    EXPECT_DOUBLE_EQ(ctrl.output, 0.0);
    EXPECT_DOUBLE_EQ(ctrl.prevError, 0.0);
}

// ── Sensor Tests ─────────────────────────────────────────────────────

TEST(SensorTest, BasicConstruction) {
    Sensor s(0, "CO2_sensor", SensorType::Concentration, 1, 0);
    EXPECT_EQ(s.id, 0);
    EXPECT_EQ(s.type, SensorType::Concentration);
    EXPECT_EQ(s.targetId, 1);
    EXPECT_EQ(s.speciesIdx, 0);
    EXPECT_DOUBLE_EQ(s.lastReading, 0.0);
}

// ── Actuator Tests ───────────────────────────────────────────────────

TEST(ActuatorTest, BasicConstruction) {
    Actuator a(0, "Damper_act", ActuatorType::DamperFraction, 2);
    EXPECT_EQ(a.id, 0);
    EXPECT_EQ(a.type, ActuatorType::DamperFraction);
    EXPECT_EQ(a.linkIdx, 2);
    EXPECT_DOUBLE_EQ(a.currentValue, 0.0);
}

// ── Integration: Control Loop in Transient Simulation ────────────────

TEST(ControlIntegrationTest, DamperControlLoop) {
    // Setup: Room with CO2 source, damper controlled by CO2 sensor
    // When CO2 rises above setpoint, damper opens to ventilate
    Network net;

    Node outdoor(0, "Outdoor", NodeType::Ambient);
    outdoor.setTemperature(283.15);
    net.addNode(outdoor);

    Node room(1, "Room");
    room.setTemperature(293.15);
    room.setVolume(30.0);
    net.addNode(room);

    // Inlet crack (always open)
    Link l1(1, 0, 1, 0.5);
    l1.setFlowElement(std::make_unique<PowerLawOrifice>(0.003, 0.65));
    net.addLink(std::move(l1));

    // Outlet damper (controlled by CO2 level)
    Link l2(2, 1, 0, 2.5);
    l2.setFlowElement(std::make_unique<Damper>(0.005, 0.65, 0.1));  // starts mostly closed
    net.addLink(std::move(l2));

    // Species: CO2
    Species co2(0, "CO2", 0.044, 0.0, 7.2e-4);

    // Source: constant CO2 in room
    Source src(1, 0, 5e-6);

    // Control: sensor reads CO2 in room → controller → damper actuator
    Sensor sensor(0, "CO2_sensor", SensorType::Concentration, 1, 0);
    Controller ctrl(0, "CO2_ctrl", 0, 0, 0.001, 500.0, 10.0);  // setpoint=0.001 kg/m³
    Actuator act(0, "Damper_act", ActuatorType::DamperFraction, 1);  // link index 1 = damper

    TransientSimulation sim;
    TransientConfig config;
    config.startTime = 0;
    config.endTime = 1800;  // 30 minutes
    config.timeStep = 30;
    config.outputInterval = 300;  // every 5 min

    sim.setConfig(config);
    sim.setSpecies({co2});
    sim.setSources({src});
    sim.setSensors({sensor});
    sim.setControllers({ctrl});
    sim.setActuators({act});

    auto result = sim.run(net);
    EXPECT_TRUE(result.completed);
    EXPECT_GE(result.history.size(), 2);

    // CO2 should have changed over time
    if (result.history.size() >= 2) {
        double co2_start = result.history[0].contaminant.concentrations[1][0];
        double co2_end = result.history.back().contaminant.concentrations[1][0];
        // CO2 should have risen from initial (0) due to source
        EXPECT_GT(co2_end, co2_start);
    }
}

// ── Occupant Exposure Tests ──────────────────────────────────────────

TEST(OccupantTest, InitExposure) {
    Occupant occ(0, "Worker", 1, 1.2e-4);
    occ.initExposure(2);
    EXPECT_EQ(occ.exposure.size(), 2);
    EXPECT_DOUBLE_EQ(occ.exposure[0].cumulativeDose, 0.0);
    EXPECT_DOUBLE_EQ(occ.exposure[1].peakConcentration, 0.0);
}

TEST(OccupantTest, CumulativeDose) {
    Occupant occ(0, "Worker", 1, 1.0e-4);  // 0.1 L/s breathing rate
    occ.initExposure(1);

    // Expose to 0.001 kg/m³ for 3600s (1 hour)
    std::vector<double> conc = {0.001};
    for (int i = 0; i < 60; ++i) {
        occ.updateExposure(conc, i * 60.0, 60.0);
    }

    // Expected dose = breathingRate * concentration * totalTime
    // = 1e-4 * 0.001 * 3600 = 3.6e-4 kg
    EXPECT_NEAR(occ.exposure[0].cumulativeDose, 3.6e-4, 1e-8);
    EXPECT_DOUBLE_EQ(occ.exposure[0].peakConcentration, 0.001);
    EXPECT_NEAR(occ.exposure[0].totalExposureTime, 3600.0, 1e-10);
}

TEST(OccupantTest, PeakTracking) {
    Occupant occ(0, "Worker", 1, 1.0e-4);
    occ.initExposure(1);

    occ.updateExposure({0.001}, 0.0, 60.0);
    occ.updateExposure({0.005}, 60.0, 60.0);  // peak
    occ.updateExposure({0.002}, 120.0, 60.0);

    EXPECT_DOUBLE_EQ(occ.exposure[0].peakConcentration, 0.005);
    EXPECT_DOUBLE_EQ(occ.exposure[0].timeAtPeak, 60.0);
}

TEST(OccupantTest, MultiSpecies) {
    Occupant occ(0, "Worker", 1, 1.0e-4);
    occ.initExposure(2);

    std::vector<double> conc = {0.001, 0.0005};
    occ.updateExposure(conc, 0.0, 100.0);

    EXPECT_NEAR(occ.exposure[0].cumulativeDose, 1.0e-4 * 0.001 * 100.0, 1e-12);
    EXPECT_NEAR(occ.exposure[1].cumulativeDose, 1.0e-4 * 0.0005 * 100.0, 1e-12);
}
