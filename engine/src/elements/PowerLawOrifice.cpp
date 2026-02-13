#include "elements/PowerLawOrifice.h"
#include <cmath>
#include <stdexcept>

namespace contam {

PowerLawOrifice::PowerLawOrifice(double C, double n)
    : C_(C), n_(n)
{
    if (C <= 0.0) {
        throw std::invalid_argument("Flow coefficient C must be positive");
    }
    if (n < 0.5 || n > 1.0) {
        throw std::invalid_argument("Flow exponent n must be in [0.5, 1.0]");
    }

    // Pre-compute linearization slope at DP_MIN boundary
    // Use chord slope: flow(DP_MIN) / DP_MIN = C * DP_MIN^n / DP_MIN = C * DP_MIN^(n-1)
    // This ensures flow continuity at the linearization boundary
    linearSlope_ = C_ * std::pow(DP_MIN, n_ - 1.0);
}

FlowResult PowerLawOrifice::calculate(double deltaP, double density) const {
    FlowResult result;

    double absDp = std::abs(deltaP);
    double sign = (deltaP >= 0.0) ? 1.0 : -1.0;

    if (absDp < DP_MIN) {
        // Linearized regime: avoid derivative singularity near zero
        // ṁ = ρ · linearSlope · ΔP
        // d(ṁ)/d(ΔP) = ρ · linearSlope
        result.massFlow = density * linearSlope_ * deltaP;
        result.derivative = density * linearSlope_;
    } else {
        // Normal power law regime
        // ṁ = ρ · C · |ΔP|^n · sign(ΔP)
        double flow = C_ * std::pow(absDp, n_);
        result.massFlow = density * flow * sign;

        // d(ṁ)/d(ΔP) = ρ · n · C · |ΔP|^(n-1)
        // Always positive (Jacobian convention)
        result.derivative = density * n_ * C_ * std::pow(absDp, n_ - 1.0);
    }

    return result;
}

std::unique_ptr<FlowElement> PowerLawOrifice::clone() const {
    return std::make_unique<PowerLawOrifice>(*this);
}

} // namespace contam
