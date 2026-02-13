#pragma once

#include "elements/FlowElement.h"
#include "utils/Constants.h"

namespace contam {

// Power Law Orifice Model
// Flow: ṁ = ρ · C · |ΔP|^n · sign(ΔP)
// Derivative: d = n · ρ · C · |ΔP|^(n-1)
// Linearized when |ΔP| < DP_MIN to avoid derivative singularity
class PowerLawOrifice : public FlowElement {
public:
    // C: flow coefficient (m^3/(s·Pa^n))
    // n: flow exponent (0.5 = turbulent, 1.0 = laminar, typical 0.5-0.65)
    PowerLawOrifice(double C, double n);

    FlowResult calculate(double deltaP, double density) const override;
    std::string typeName() const override { return "PowerLawOrifice"; }
    std::unique_ptr<FlowElement> clone() const override;

    double getFlowCoefficient() const { return C_; }
    double getFlowExponent() const { return n_; }

private:
    double C_;  // flow coefficient
    double n_;  // flow exponent

    // Linearization coefficients (computed at DP_MIN)
    double linearSlope_;  // slope for linear regime
};

} // namespace contam
