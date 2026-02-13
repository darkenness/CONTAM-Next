#pragma once

#include "elements/FlowElement.h"

namespace contam {

// Damper / Variable Opening Model
// Combines a power-law orifice with a variable opening fraction (0-1).
// When fully open (fraction=1): behaves as PowerLawOrifice with full C.
// When fully closed (fraction=0): no flow.
// Effective coefficient: C_eff = C_max * fraction
//
// Flow: ṁ = ρ · C_eff · |ΔP|^n · sign(ΔP)
class Damper : public FlowElement {
public:
    // Cmax: maximum flow coefficient (m³/(s·Pa^n)) at full open
    // n: flow exponent (0.5-1.0)
    // fraction: opening fraction (0.0-1.0)
    Damper(double Cmax, double n, double fraction = 1.0);

    FlowResult calculate(double deltaP, double density) const override;
    std::string typeName() const override { return "Damper"; }
    std::unique_ptr<FlowElement> clone() const override;

    double getCmax() const { return Cmax_; }
    double getFlowExponent() const { return n_; }
    double getFraction() const { return fraction_; }
    void setFraction(double f);

private:
    double Cmax_;
    double n_;
    double fraction_;
    double Ceff_;          // effective coefficient = Cmax * fraction
    double linearSlope_;   // for linearization near ΔP=0

    void updateEffective();
};

} // namespace contam
