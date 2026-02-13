#include <gtest/gtest.h>
#include "elements/PowerLawOrifice.h"
#include <cmath>

using namespace contam;

class PowerLawOrificeTest : public ::testing::Test {
protected:
    // Typical crack: C=0.001, n=0.65
    PowerLawOrifice crack{0.001, 0.65};
    // Pure turbulent orifice: C=0.01, n=0.5
    PowerLawOrifice orifice{0.01, 0.5};
    double density = 1.2;  // kg/m^3 (standard air)
};

TEST_F(PowerLawOrificeTest, PositivePressureDifference) {
    auto result = crack.calculate(10.0, density);
    // ṁ = ρ * C * |ΔP|^n = 1.2 * 0.001 * 10^0.65
    double expected = density * 0.001 * std::pow(10.0, 0.65);
    EXPECT_NEAR(result.massFlow, expected, 1e-10);
    EXPECT_GT(result.massFlow, 0.0);
    EXPECT_GT(result.derivative, 0.0);
}

TEST_F(PowerLawOrificeTest, NegativePressureDifference) {
    auto result = crack.calculate(-10.0, density);
    double expected = -density * 0.001 * std::pow(10.0, 0.65);
    EXPECT_NEAR(result.massFlow, expected, 1e-10);
    EXPECT_LT(result.massFlow, 0.0);
    EXPECT_GT(result.derivative, 0.0);  // derivative always positive
}

TEST_F(PowerLawOrificeTest, ZeroPressureLinearization) {
    // Near zero, should use linearized model
    auto result = crack.calculate(0.0001, density);
    EXPECT_GT(result.massFlow, 0.0);
    EXPECT_GT(result.derivative, 0.0);

    // Check symmetry
    auto resultNeg = crack.calculate(-0.0001, density);
    EXPECT_NEAR(result.massFlow, -resultNeg.massFlow, 1e-15);
    EXPECT_NEAR(result.derivative, resultNeg.derivative, 1e-15);
}

TEST_F(PowerLawOrificeTest, LinearizationContinuity) {
    // Flow should be continuous at DP_MIN boundary
    double dpBelow = DP_MIN * 0.999;
    double dpAbove = DP_MIN * 1.001;

    auto below = crack.calculate(dpBelow, density);
    auto above = crack.calculate(dpAbove, density);

    // Flow values should be close at the boundary
    EXPECT_NEAR(below.massFlow, above.massFlow, 1e-6);
}

TEST_F(PowerLawOrificeTest, DerivativeAccuracy) {
    // Numerical derivative check at ΔP = 50 Pa
    double dp = 50.0;
    double eps = 1e-6;
    auto fPlus = orifice.calculate(dp + eps, density);
    auto fMinus = orifice.calculate(dp - eps, density);

    double numericalDeriv = (fPlus.massFlow - fMinus.massFlow) / (2.0 * eps);
    auto result = orifice.calculate(dp, density);

    EXPECT_NEAR(result.derivative, numericalDeriv, 1e-4);
}

TEST_F(PowerLawOrificeTest, TurbulentOrifice) {
    // n=0.5: ṁ = ρ * C * sqrt(|ΔP|)
    auto result = orifice.calculate(100.0, density);
    double expected = density * 0.01 * std::sqrt(100.0);
    EXPECT_NEAR(result.massFlow, expected, 1e-10);
}

TEST_F(PowerLawOrificeTest, InvalidParameters) {
    EXPECT_THROW(PowerLawOrifice(0.0, 0.65), std::invalid_argument);
    EXPECT_THROW(PowerLawOrifice(-1.0, 0.65), std::invalid_argument);
    EXPECT_THROW(PowerLawOrifice(0.001, 0.3), std::invalid_argument);
    EXPECT_THROW(PowerLawOrifice(0.001, 1.5), std::invalid_argument);
}
