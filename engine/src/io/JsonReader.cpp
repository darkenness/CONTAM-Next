#include "io/JsonReader.h"
#include "elements/PowerLawOrifice.h"
#include <nlohmann/json.hpp>
#include <fstream>
#include <stdexcept>

using json = nlohmann::json;

namespace contam {

Network JsonReader::readFromFile(const std::string& filepath) {
    std::ifstream ifs(filepath);
    if (!ifs.is_open()) {
        throw std::runtime_error("Cannot open file: " + filepath);
    }
    json j;
    ifs >> j;
    return readFromString(j.dump());
}

Network JsonReader::readFromString(const std::string& jsonStr) {
    json j = json::parse(jsonStr);
    Network network;

    // Parse ambient conditions
    if (j.contains("ambient")) {
        auto& amb = j["ambient"];
        if (amb.contains("temperature")) {
            network.setAmbientTemperature(amb["temperature"].get<double>());
        }
        if (amb.contains("pressure")) {
            network.setAmbientPressure(amb["pressure"].get<double>());
        }
        if (amb.contains("windSpeed")) {
            network.setWindSpeed(amb["windSpeed"].get<double>());
        }
        if (amb.contains("windDirection")) {
            network.setWindDirection(amb["windDirection"].get<double>());
        }
    }

    // Parse flow element definitions (reusable templates)
    std::unordered_map<std::string, json> elementDefs;
    if (j.contains("flowElements")) {
        for (auto& [key, val] : j["flowElements"].items()) {
            elementDefs[key] = val;
        }
    }

    // Parse nodes
    if (j.contains("nodes")) {
        for (auto& jNode : j["nodes"]) {
            int id = jNode["id"].get<int>();
            std::string name = jNode.value("name", "Node_" + std::to_string(id));

            NodeType type = NodeType::Normal;
            if (jNode.contains("type")) {
                std::string t = jNode["type"].get<std::string>();
                if (t == "ambient") type = NodeType::Ambient;
                else if (t == "phantom") type = NodeType::Phantom;
                else if (t == "cfd") type = NodeType::CFD;
            }

            Node node(id, name, type);

            if (jNode.contains("temperature")) {
                node.setTemperature(jNode["temperature"].get<double>());
            } else if (type == NodeType::Ambient) {
                node.setTemperature(network.getAmbientTemperature());
            }

            if (jNode.contains("elevation")) {
                node.setElevation(jNode["elevation"].get<double>());
            }
            if (jNode.contains("volume")) {
                node.setVolume(jNode["volume"].get<double>());
            }
            if (jNode.contains("pressure")) {
                node.setPressure(jNode["pressure"].get<double>());
            }

            node.updateDensity();
            network.addNode(node);
        }
    }

    // Parse links
    if (j.contains("links")) {
        for (auto& jLink : j["links"]) {
            int id = jLink["id"].get<int>();
            int fromId = jLink["from"].get<int>();
            int toId = jLink["to"].get<int>();
            double elevation = jLink.value("elevation", 0.0);

            // Resolve node IDs to indices
            int fromIdx = network.getNodeIndexById(fromId);
            int toIdx = network.getNodeIndexById(toId);

            Link link(id, fromIdx, toIdx, elevation);

            // Create flow element
            if (jLink.contains("element")) {
                auto& elemRef = jLink["element"];
                json elemDef;

                if (elemRef.is_string()) {
                    // Reference to a named element definition
                    std::string ref = elemRef.get<std::string>();
                    if (elementDefs.count(ref)) {
                        elemDef = elementDefs[ref];
                    } else {
                        throw std::runtime_error("Unknown flow element reference: " + ref);
                    }
                } else {
                    // Inline definition
                    elemDef = elemRef;
                }

                std::string elemType = elemDef["type"].get<std::string>();
                if (elemType == "PowerLawOrifice") {
                    double C = elemDef["C"].get<double>();
                    double n = elemDef["n"].get<double>();
                    link.setFlowElement(std::make_unique<PowerLawOrifice>(C, n));
                }
                // Future: add more element types here
            }

            network.addLink(std::move(link));
        }
    }

    return network;
}

} // namespace contam
