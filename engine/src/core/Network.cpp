#include "core/Network.h"
#include <stdexcept>

namespace contam {

void Network::addNode(const Node& node) {
    int index = static_cast<int>(nodes_.size());
    idToIndex_[node.getId()] = index;
    nodes_.push_back(node);
}

int Network::getNodeIndexById(int id) const {
    auto it = idToIndex_.find(id);
    if (it == idToIndex_.end()) {
        throw std::runtime_error("Node ID " + std::to_string(id) + " not found");
    }
    return it->second;
}

void Network::addLink(Link&& link) {
    links_.push_back(std::move(link));
}

int Network::getUnknownCount() const {
    int count = 0;
    for (const auto& node : nodes_) {
        if (!node.isKnownPressure()) {
            ++count;
        }
    }
    return count;
}

void Network::updateAllDensities() {
    for (auto& node : nodes_) {
        node.updateDensity();
    }
}

} // namespace contam
