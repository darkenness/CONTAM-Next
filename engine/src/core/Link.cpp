#include "core/Link.h"

namespace contam {

Link::Link(int id, int nodeFrom, int nodeTo, double elevation)
    : id_(id), nodeFrom_(nodeFrom), nodeTo_(nodeTo), elevation_(elevation)
{
}

Link::Link(const Link& other)
    : id_(other.id_), nodeFrom_(other.nodeFrom_), nodeTo_(other.nodeTo_),
      elevation_(other.elevation_), massFlow_(other.massFlow_), derivative_(other.derivative_) {
    if (other.flowElement_) {
        flowElement_ = other.flowElement_->clone();
    }
}

Link& Link::operator=(const Link& other) {
    if (this != &other) {
        id_ = other.id_;
        nodeFrom_ = other.nodeFrom_;
        nodeTo_ = other.nodeTo_;
        elevation_ = other.elevation_;
        massFlow_ = other.massFlow_;
        derivative_ = other.derivative_;
        flowElement_ = other.flowElement_ ? other.flowElement_->clone() : nullptr;
    }
    return *this;
}

void Link::setFlowElement(std::unique_ptr<FlowElement> elem) {
    flowElement_ = std::move(elem);
}

} // namespace contam
