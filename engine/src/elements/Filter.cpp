#include "elements/Filter.h"
#include "utils/Constants.h"
#include <cmath>
#include <stdexcept>

namespace contam {

Filter::Filter(double C, double n, double efficiency)
    : C_(C), n_(n), efficiency_(std::clamp(efficiency, 0.0, 1.0)) {
    if (C_ <= 0.0) throw std::invalid_argument("Filter C must be positive");
    if (n_ < 0.5 || n_ > 1.0) throw std::invalid_argument("Filter n must be in [0.5, 1.0]");

    double rho_ref = 1.2;
    double flow_at_min = rho_ref * C_ * std::pow(DP_MIN, n_);
    linearSlope_ = flow_at_min / DP_MIN;
}

FlowResult Filter::calculate(double deltaP, double density) const {
    double absDp = std::abs(deltaP);
    double sign = (deltaP >= 0.0) ? 1.0 : -1.0;

    double massFlow, derivative;

    if (absDp < DP_MIN) {
        massFlow = linearSlope_ * deltaP;
        derivative = linearSlope_;
    } else {
        double flow = density * C_ * std::pow(absDp, n_);
        massFlow = flow * sign;
        derivative = n_ * density * C_ * std::pow(absDp, n_ - 1.0);
    }

    return { massFlow, derivative };
}

std::unique_ptr<FlowElement> Filter::clone() const {
    return std::make_unique<Filter>(*this);
}

} // namespace contam
