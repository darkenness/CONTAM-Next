#include "core/Node.h"

namespace contam {

Node::Node(int id, const std::string& name, NodeType type)
    : id_(id), name_(name), type_(type)
{
    updateDensity();
}

void Node::updateDensity() {
    updateDensity(P_ATM + pressure_);
}

void Node::updateDensity(double absolutePressure) {
    // Ideal gas law: ρ = P_abs / (R_air * T)
    if (temperature_ > 0.0) {
        density_ = absolutePressure / (R_AIR * temperature_);
    }
}

} // namespace contam
