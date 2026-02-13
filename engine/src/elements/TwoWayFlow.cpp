#include "elements/TwoWayFlow.h"
#include "utils/Constants.h"
#include <cmath>
#include <algorithm>
#include <stdexcept>

namespace contam {

TwoWayFlow::TwoWayFlow(double Cd, double area)
    : Cd_(Cd), area_(area) {
    if (Cd_ <= 0.0 || area_ <= 0.0) {
        throw std::invalid_argument("TwoWayFlow: Cd and area must be positive");
    }
    // Linearization at DP_MIN: use chord slope for continuity
    // Q = Cd * A * sqrt(2 * DP_MIN / ρ_ref)
    // Using ρ_ref = 1.2 kg/m³ for linearization coefficient
    double rho_ref = 1.2;
    double Q_at_min = Cd_ * area_ * std::sqrt(2.0 * DP_MIN / rho_ref);
    linearSlope_ = rho_ref * Q_at_min / DP_MIN;
}

FlowResult TwoWayFlow::calculate(double deltaP, double density) const {
    double absDp = std::abs(deltaP);
    double sign = (deltaP >= 0.0) ? 1.0 : -1.0;

    double massFlow, derivative;

    if (absDp < DP_MIN) {
        // Linear regime near zero pressure difference
        massFlow = linearSlope_ * deltaP;
        derivative = linearSlope_;
    } else {
        // Orifice equation: Q = Cd * A * sqrt(2 * |ΔP| / ρ)
        double Q = Cd_ * area_ * std::sqrt(2.0 * absDp / density);
        massFlow = density * Q * sign;

        // Derivative: d(ṁ)/d(ΔP) = 0.5 * ρ * Cd * A * sqrt(2 / (ρ * |ΔP|))
        //           = 0.5 * Cd * A * sqrt(2 * ρ / |ΔP|)
        derivative = 0.5 * Cd_ * area_ * std::sqrt(2.0 * density / absDp);
    }

    return {massFlow, derivative};
}

std::unique_ptr<FlowElement> TwoWayFlow::clone() const {
    return std::make_unique<TwoWayFlow>(*this);
}

} // namespace contam
