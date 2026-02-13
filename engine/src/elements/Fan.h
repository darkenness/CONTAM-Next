#pragma once

#include "elements/FlowElement.h"
#include <vector>
#include <utility>

namespace contam {

// Fan / Blower Model
// Uses a polynomial performance curve: ΔP = a0 + a1*Q + a2*Q^2 + ...
// where Q is the volumetric flow rate (m³/s)
// The fan maintains flow against a pressure difference.
// When ΔP exceeds the shutoff pressure (a0), flow is zero.
// Flow is always in the positive direction (from node_i to node_j).
class Fan : public FlowElement {
public:
    // maxFlow: maximum volumetric flow rate at zero pressure (m³/s)
    // shutoffPressure: pressure at which flow drops to zero (Pa)
    Fan(double maxFlow, double shutoffPressure);

    FlowResult calculate(double deltaP, double density) const override;
    std::string typeName() const override { return "Fan"; }
    std::unique_ptr<FlowElement> clone() const override;

    double getMaxFlow() const { return maxFlow_; }
    double getShutoffPressure() const { return shutoffPressure_; }

private:
    double maxFlow_;          // m³/s at ΔP=0
    double shutoffPressure_;  // Pa, fan curve intercept
};

} // namespace contam
