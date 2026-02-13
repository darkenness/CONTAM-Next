#include "elements/Fan.h"
#include <cmath>
#include <algorithm>
#include <stdexcept>

namespace contam {

Fan::Fan(double maxFlow, double shutoffPressure)
    : maxFlow_(maxFlow), shutoffPressure_(std::abs(shutoffPressure)) {
    if (maxFlow_ <= 0.0) {
        throw std::invalid_argument("Fan maxFlow must be positive");
    }
    if (shutoffPressure_ <= 0.0) {
        throw std::invalid_argument("Fan shutoffPressure must be positive");
    }
}

FlowResult Fan::calculate(double deltaP, double density) const {
    // Simple linear fan curve: Q = maxFlow * (1 - deltaP / shutoffPressure)
    // Fan pushes flow in positive direction (from i to j)
    // deltaP > 0 means resistance against fan
    // deltaP < 0 means fan is assisted (flow increases)

    double Q = maxFlow_ * (1.0 - deltaP / shutoffPressure_);

    // Fan cannot reverse flow
    if (Q < 0.0) {
        Q = 0.0;
    }

    double massFlow = density * Q;

    // Derivative: d(massFlow)/d(deltaP)
    double dQdP = -maxFlow_ / shutoffPressure_;
    double derivative = density * dQdP;

    // When fan is at shutoff (Q <= 0), derivative should be very small
    if (Q <= 0.0) {
        derivative = -density * 1e-10; // tiny slope for numerical stability
    }

    return {massFlow, derivative};
}

std::unique_ptr<FlowElement> Fan::clone() const {
    return std::make_unique<Fan>(*this);
}

} // namespace contam
