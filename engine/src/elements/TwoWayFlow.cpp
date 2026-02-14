#include "elements/TwoWayFlow.h"
#include "utils/Constants.h"
#include <cmath>
#include <algorithm>
#include <stdexcept>

namespace contam {

TwoWayFlow::TwoWayFlow(double Cd, double area, double height, double width)
    : Cd_(Cd), area_(area), height_(height) {
    if (Cd_ <= 0.0 || area_ <= 0.0) {
        throw std::invalid_argument("TwoWayFlow: Cd and area must be positive");
    }
    if (height_ <= 0.0) height_ = 2.0;
    width_ = (width > 0.0) ? width : area_ / height_;

    double rho_ref = 1.2;
    double Q_at_min = Cd_ * area_ * std::sqrt(2.0 * DP_MIN / rho_ref);
    linearSlope_ = rho_ref * Q_at_min / DP_MIN;
}

FlowResult TwoWayFlow::calculate(double deltaP, double density) const {
    // Simplified single-direction orifice (used when only average density available)
    double absDp = std::abs(deltaP);
    double sign = (deltaP >= 0.0) ? 1.0 : -1.0;

    double massFlow, derivative;

    if (absDp < DP_MIN) {
        massFlow = linearSlope_ * deltaP;
        derivative = linearSlope_;
    } else {
        double Q = Cd_ * area_ * std::sqrt(2.0 * absDp / density);
        massFlow = density * Q * sign;
        derivative = 0.5 * Cd_ * area_ * std::sqrt(2.0 * density / absDp);
    }

    return {massFlow, derivative};
}

TwoWayFlow::BidirectionalResult TwoWayFlow::calculateBidirectional(
    double deltaP, double densityI, double densityJ,
    double elevI, double elevJ, double elevLink) const
{
    BidirectionalResult result = {0.0, 0.0, 0.0, 0.0};

    double drho = densityI - densityJ;
    double avgDensity = 0.5 * (densityI + densityJ);

    // If density difference is negligible, use simplified orifice
    if (std::abs(drho) < 1e-6) {
        auto simple = calculate(deltaP, avgDensity);
        result.netMassFlow = simple.massFlow;
        result.derivative = simple.derivative;
        if (simple.massFlow > 0) result.flow_ij = simple.massFlow;
        else result.flow_ji = -simple.massFlow;
        return result;
    }

    // Brown-Solvason bidirectional model
    // Opening bottom and top elevations
    double Zbot = elevLink - height_ * 0.5;
    double Ztop = elevLink + height_ * 0.5;

    // Neutral pressure plane height:
    // Z_np = (P_j - P_i + ρ_i·g·Z_i - ρ_j·g·Z_j) / (g·(ρ_i - ρ_j))
    // But in our convention, deltaP = P_eff_i - P_eff_j at the link elevation
    // The pressure difference at height z relative to link center:
    //   ΔP(z) = deltaP + (ρ_i - ρ_j) · g · (z - elevLink)
    //         = deltaP + drho · g · (z - elevLink)
    // Neutral plane where ΔP(z) = 0:
    //   z_np = elevLink - deltaP / (drho · g)
    double Znp = elevLink - deltaP / (drho * GRAVITY);

    // Clamp neutral plane to opening boundaries
    bool npInOpening = (Znp > Zbot && Znp < Ztop);

    if (!npInOpening) {
        // Neutral plane outside opening: unidirectional flow
        // Use pressure at midpoint
        auto simple = calculate(deltaP, avgDensity);
        result.netMassFlow = simple.massFlow;
        result.derivative = simple.derivative;
        if (simple.massFlow > 0) result.flow_ij = simple.massFlow;
        else result.flow_ji = -simple.massFlow;
        return result;
    }

    // Bidirectional: integrate above and below neutral plane separately
    // Below neutral plane (Zbot to Znp): ΔP(z) has one sign
    // Above neutral plane (Znp to Ztop): ΔP(z) has opposite sign

    // Integration of ṁ = ∫ Cd·W·ρ·sqrt(2|ΔP(z)|/ρ) dz
    // where ΔP(z) = drho·g·(z - Znp) (relative to neutral plane)
    //
    // For region from z1 to z2 where z > Znp (or z < Znp):
    //   |ΔP(z)| = |drho·g| · |z - Znp|
    //   ṁ = Cd·W·ρ · ∫ sqrt(2·|drho·g|·|z-Znp|/ρ) dz
    //     = Cd·W·ρ · sqrt(2·|drho·g|/ρ) · ∫ sqrt(|z-Znp|) dz
    //     = Cd·W·ρ · sqrt(2·|drho·g|/ρ) · (2/3)·h^(3/2)
    //   where h = distance from neutral plane to integration boundary

    double absGDrho = std::abs(drho * GRAVITY);
    double coeffI = Cd_ * width_ * densityI * std::sqrt(2.0 * absGDrho / densityI);
    double coeffJ = Cd_ * width_ * densityJ * std::sqrt(2.0 * absGDrho / densityJ);

    double hBelow = Znp - Zbot;  // distance below neutral plane
    double hAbove = Ztop - Znp;  // distance above neutral plane

    // Flow direction depends on sign of drho:
    // If drho > 0 (ρ_i > ρ_j, zone i is colder/denser):
    //   Below Znp: ΔP > 0 → flow i→j
    //   Above Znp: ΔP < 0 → flow j→i
    double flowBelow = (2.0 / 3.0) * std::pow(std::max(hBelow, 0.0), 1.5);
    double flowAbove = (2.0 / 3.0) * std::pow(std::max(hAbove, 0.0), 1.5);

    if (drho > 0) {
        // Below: i→j (using density i), Above: j→i (using density j)
        result.flow_ij = coeffI * flowBelow;
        result.flow_ji = coeffJ * flowAbove;
    } else {
        // Below: j→i, Above: i→j
        result.flow_ji = coeffJ * flowBelow;
        result.flow_ij = coeffI * flowAbove;
    }

    result.netMassFlow = result.flow_ij - result.flow_ji;

    // Derivative approximation:
    // d(netFlow)/d(deltaP) ≈ d(Znp)/d(deltaP) effect on integration limits
    // d(Znp)/d(deltaP) = -1/(drho·g)
    // Numerical derivative for robustness:
    double eps = std::max(std::abs(deltaP) * 1e-6, 1e-8);
    double Znp_plus = elevLink - (deltaP + eps) / (drho * GRAVITY);
    double hBelow_p = std::clamp(Znp_plus - Zbot, 0.0, height_);
    double hAbove_p = std::clamp(Ztop - Znp_plus, 0.0, height_);
    double fB_p = (2.0 / 3.0) * std::pow(hBelow_p, 1.5);
    double fA_p = (2.0 / 3.0) * std::pow(hAbove_p, 1.5);
    double net_plus;
    if (drho > 0)
        net_plus = coeffI * fB_p - coeffJ * fA_p;
    else
        net_plus = coeffI * fA_p - coeffJ * fB_p;

    result.derivative = std::abs((net_plus - result.netMassFlow) / eps);
    if (result.derivative < 1e-15) result.derivative = linearSlope_;

    return result;
}

std::unique_ptr<FlowElement> TwoWayFlow::clone() const {
    return std::make_unique<TwoWayFlow>(*this);
}

} // namespace contam
