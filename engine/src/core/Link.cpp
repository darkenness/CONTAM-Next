#include "core/Link.h"

namespace contam {

Link::Link(int id, int nodeFrom, int nodeTo, double elevation)
    : id_(id), nodeFrom_(nodeFrom), nodeTo_(nodeTo), elevation_(elevation)
{
}

void Link::setFlowElement(std::unique_ptr<FlowElement> elem) {
    flowElement_ = std::move(elem);
}

} // namespace contam
