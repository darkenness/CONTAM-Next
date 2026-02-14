#pragma once

#include "elements/FlowElement.h"

namespace contam {

// Two-Way Flow (Large Opening) — Brown-Solvason Bidirectional Model
//
// Based on Brown and Solvason (1962) integration theory.
// For a vertical opening (door/window) connecting zones with different densities,
// a neutral pressure plane forms where ΔP(z) = 0. Above and below this plane,
// flow goes in opposite directions.
//
// Neutral plane height:
//   Z_np = (P_j - P_i + ρ_i·g·Z_i - ρ_j·g·Z_j) / (g·(ρ_i - ρ_j))
//
// Bidirectional integration:
//   dQ = Cd · W · dz · sqrt(2·|ΔP(z)|/ρ)
//
// When density difference is negligible (|ρ_i - ρ_j| < threshold),
// falls back to simplified orifice equation.
//
// Extended interface: calculate() uses average density for simplified mode.
// For full bidirectional mode, use calculateBidirectional() with both densities.
class TwoWayFlow : public FlowElement {
public:
    // Cd: discharge coefficient (typically 0.5 for large openings, 0.65 for cracks)
    // area: opening area (m²)
    // height: opening height (m), needed for bidirectional integration
    // width: opening width (m), default = area/height
    TwoWayFlow(double Cd, double area, double height = 2.0, double width = 0.0);

    FlowResult calculate(double deltaP, double density) const override;
    std::string typeName() const override { return "TwoWayFlow"; }
    std::unique_ptr<FlowElement> clone() const override;

    // Full bidirectional calculation with both zone densities
    // Returns net mass flow (positive = i→j) and derivative
    // Also computes individual flow_ij (i→j) and flow_ji (j→i)
    struct BidirectionalResult {
        double netMassFlow;   // net flow (i→j positive)
        double derivative;    // d(netFlow)/d(ΔP)
        double flow_ij;       // flow from i to j (always >= 0)
        double flow_ji;       // flow from j to i (always >= 0)
    };

    BidirectionalResult calculateBidirectional(
        double deltaP, double densityI, double densityJ,
        double elevI, double elevJ, double elevLink) const;

    double getDischargeCoefficient() const { return Cd_; }
    double getArea() const { return area_; }
    double getHeight() const { return height_; }
    double getWidth() const { return width_; }

private:
    double Cd_;
    double area_;
    double height_;       // opening height (m)
    double width_;        // opening width (m)
    double linearSlope_;  // for linearization near ΔP=0
};

} // namespace contam
