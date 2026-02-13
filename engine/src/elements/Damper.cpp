#include "elements/Damper.h"
#include "utils/Constants.h"
#include <cmath>
#include <algorithm>
#include <stdexcept>

namespace contam {

Damper::Damper(double Cmax, double n, double fraction)
    : Cmax_(Cmax), n_(n), fraction_(std::clamp(fraction, 0.0, 1.0)) {
    if (Cmax_ <= 0.0) throw std::invalid_argument("Damper Cmax must be positive");
    if (n_ < 0.5 || n_ > 1.0) throw std::invalid_argument("Damper exponent n must be in [0.5, 1.0]");
    updateEffective();
}

void Damper::setFraction(double f) {
    fraction_ = std::clamp(f, 0.0, 1.0);
    updateEffective();
}

void Damper::updateEffective() {
    Ceff_ = Cmax_ * fraction_;
    double rho_ref = 1.2;
    if (Ceff_ > 1e-15) {
        double flow_at_min = rho_ref * Ceff_ * std::pow(DP_MIN, n_);
        linearSlope_ = flow_at_min / DP_MIN;
    } else {
        linearSlope_ = 1e-15;
    }
}

FlowResult Damper::calculate(double deltaP, double density) const {
    if (Ceff_ < 1e-15) {
        return { 0.0, 1e-15 };
    }

    double absDp = std::abs(deltaP);
    double sign = (deltaP >= 0.0) ? 1.0 : -1.0;

    double massFlow, derivative;

    if (absDp < DP_MIN) {
        massFlow = linearSlope_ * deltaP;
        derivative = linearSlope_;
    } else {
        double flow = density * Ceff_ * std::pow(absDp, n_);
        massFlow = flow * sign;
        derivative = n_ * density * Ceff_ * std::pow(absDp, n_ - 1.0);
    }

    return { massFlow, derivative };
}

std::unique_ptr<FlowElement> Damper::clone() const {
    return std::make_unique<Damper>(*this);
}

} // namespace contam
