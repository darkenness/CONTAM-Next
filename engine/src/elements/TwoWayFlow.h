#pragma once

#include "elements/FlowElement.h"

namespace contam {

// Two-Way Flow (Large Opening) Model
// Models flow through a large horizontal or vertical opening (e.g., doors, windows)
// where bidirectional flow can occur due to density differences.
//
// Simplified single-zone model using orifice equation:
//   Q = Cd * A * sqrt(2 * |ΔP| / ρ) * sign(ΔP)
//   ṁ = ρ * Q
//
// For the full two-layer bidirectional model, see CONTAM Theory Manual.
// This simplified version treats it as a large single-directional orifice.
class TwoWayFlow : public FlowElement {
public:
    // Cd: discharge coefficient (typically 0.6-0.78)
    // area: opening area (m²)
    TwoWayFlow(double Cd, double area);

    FlowResult calculate(double deltaP, double density) const override;
    std::string typeName() const override { return "TwoWayFlow"; }
    std::unique_ptr<FlowElement> clone() const override;

    double getDischargeCoefficient() const { return Cd_; }
    double getArea() const { return area_; }

private:
    double Cd_;
    double area_;
    double linearSlope_;  // for linearization near ΔP=0
};

} // namespace contam
