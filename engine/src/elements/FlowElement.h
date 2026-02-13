#pragma once

#include <string>
#include <memory>

namespace contam {

// Result of flow calculation: mass flow rate and its derivative w.r.t. ΔP
struct FlowResult {
    double massFlow;    // kg/s, positive = from node_i to node_j
    double derivative;  // d(massFlow)/d(ΔP), for Jacobian assembly
};

class FlowElement {
public:
    virtual ~FlowElement() = default;

    // Calculate mass flow rate given pressure difference ΔP (Pa)
    // ΔP > 0 means flow from node_i to node_j
    virtual FlowResult calculate(double deltaP, double density) const = 0;

    // Human-readable type name
    virtual std::string typeName() const = 0;

    // Clone for polymorphic copy
    virtual std::unique_ptr<FlowElement> clone() const = 0;
};

} // namespace contam
