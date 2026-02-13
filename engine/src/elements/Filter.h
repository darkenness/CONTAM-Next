#pragma once

#include "elements/FlowElement.h"
#include <algorithm>

namespace contam {

// Filter Element
// Combines a base flow element (e.g., Duct) with species-specific removal efficiency.
// The filter passes airflow like its base element but removes contaminants.
// Removal efficiency η (0-1) per species: C_out = C_in * (1 - η)
//
// For airflow purposes, it behaves as a PowerLaw orifice with given C and n.
class Filter : public FlowElement {
public:
    // C: flow coefficient, n: flow exponent (airflow resistance)
    // efficiency: default removal efficiency for all species (0-1)
    Filter(double C, double n, double efficiency = 0.9);

    FlowResult calculate(double deltaP, double density) const override;
    std::string typeName() const override { return "Filter"; }
    std::unique_ptr<FlowElement> clone() const override;

    double getFlowCoefficient() const { return C_; }
    double getFlowExponent() const { return n_; }
    double getEfficiency() const { return efficiency_; }
    void setEfficiency(double eff) { efficiency_ = std::clamp(eff, 0.0, 1.0); }

private:
    double C_;
    double n_;
    double efficiency_;   // removal efficiency (0-1)
    double linearSlope_;
};

} // namespace contam
