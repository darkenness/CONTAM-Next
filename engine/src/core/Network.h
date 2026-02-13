#pragma once

#include <vector>
#include <unordered_map>
#include <string>
#include "core/Node.h"
#include "core/Link.h"

namespace contam {

class Network {
public:
    Network() = default;

    // Node management
    void addNode(const Node& node);
    Node& getNode(int index) { return nodes_[index]; }
    const Node& getNode(int index) const { return nodes_[index]; }
    int getNodeCount() const { return static_cast<int>(nodes_.size()); }
    int getNodeIndexById(int id) const;

    // Link management
    void addLink(Link&& link);
    Link& getLink(int index) { return links_[index]; }
    const Link& getLink(int index) const { return links_[index]; }
    int getLinkCount() const { return static_cast<int>(links_.size()); }

    // Topology queries
    const std::vector<Node>& getNodes() const { return nodes_; }
    const std::vector<Link>& getLinks() const { return links_; }
    std::vector<Node>& getNodes() { return nodes_; }
    std::vector<Link>& getLinks() { return links_; }

    // Count of unknown pressure nodes (excludes Ambient)
    int getUnknownCount() const;

    // Update all node densities
    void updateAllDensities();

    // Get ambient (outdoor) conditions
    double getAmbientTemperature() const { return ambientTemperature_; }
    void setAmbientTemperature(double t) { ambientTemperature_ = t; }

    double getAmbientPressure() const { return ambientPressure_; }
    void setAmbientPressure(double p) { ambientPressure_ = p; }

    double getWindSpeed() const { return windSpeed_; }
    void setWindSpeed(double v) { windSpeed_ = v; }

    double getWindDirection() const { return windDirection_; }
    void setWindDirection(double d) { windDirection_ = d; }

private:
    std::vector<Node> nodes_;
    std::vector<Link> links_;
    std::unordered_map<int, int> idToIndex_;  // node.id -> vector index

    double ambientTemperature_ = 293.15;  // K (20°C)
    double ambientPressure_ = 0.0;        // Pa (gauge)
    double windSpeed_ = 0.0;              // m/s
    double windDirection_ = 0.0;          // degrees from north
};

} // namespace contam
