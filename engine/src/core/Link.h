#pragma once

#include <memory>
#include <string>
#include "elements/FlowElement.h"

namespace contam {

class Link {
public:
    Link() = default;
    Link(int id, int nodeFrom, int nodeTo, double elevation);

    int getId() const { return id_; }
    int getNodeFrom() const { return nodeFrom_; }
    int getNodeTo() const { return nodeTo_; }
    double getElevation() const { return elevation_; }

    double getMassFlow() const { return massFlow_; }
    void setMassFlow(double m) { massFlow_ = m; }

    double getDerivative() const { return derivative_; }
    void setDerivative(double d) { derivative_ = d; }

    const FlowElement* getFlowElement() const { return flowElement_.get(); }
    void setFlowElement(std::unique_ptr<FlowElement> elem);

private:
    int id_ = 0;
    int nodeFrom_ = -1;   // index into Network's node array
    int nodeTo_ = -1;     // index into Network's node array
    double elevation_ = 0.0;  // Z_k: centerline elevation of the path (m)

    std::unique_ptr<FlowElement> flowElement_;

    double massFlow_ = 0.0;    // kg/s, computed result
    double derivative_ = 0.0;  // d(ṁ)/d(ΔP), for Jacobian
};

} // namespace contam
