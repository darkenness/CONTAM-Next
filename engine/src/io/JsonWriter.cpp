#include "io/JsonWriter.h"
#include <nlohmann/json.hpp>
#include <fstream>

using json = nlohmann::json;

namespace contam {

std::string JsonWriter::writeToString(const Network& network,
                                       const SolverResult& result) {
    json j;

    // Solver info
    j["solver"]["converged"] = result.converged;
    j["solver"]["iterations"] = result.iterations;
    j["solver"]["maxResidual"] = result.maxResidual;

    // Node results
    json nodesArr = json::array();
    for (int i = 0; i < network.getNodeCount(); ++i) {
        const auto& node = network.getNode(i);
        json jn;
        jn["id"] = node.getId();
        jn["name"] = node.getName();
        jn["pressure"] = result.pressures[i];
        jn["density"] = node.getDensity();
        jn["temperature"] = node.getTemperature();
        jn["elevation"] = node.getElevation();
        nodesArr.push_back(jn);
    }
    j["nodes"] = nodesArr;

    // Link results
    json linksArr = json::array();
    for (int i = 0; i < network.getLinkCount(); ++i) {
        const auto& link = network.getLink(i);
        json jl;
        jl["id"] = link.getId();
        jl["from"] = network.getNode(link.getNodeFrom()).getId();
        jl["to"] = network.getNode(link.getNodeTo()).getId();
        jl["massFlow"] = result.massFlows[i];
        jl["volumeFlow_m3s"] = (network.getNode(link.getNodeFrom()).getDensity() > 0)
            ? result.massFlows[i] / network.getNode(link.getNodeFrom()).getDensity()
            : 0.0;
        linksArr.push_back(jl);
    }
    j["links"] = linksArr;

    return j.dump(2);
}

void JsonWriter::writeToFile(const std::string& filepath,
                              const Network& network,
                              const SolverResult& result) {
    std::ofstream ofs(filepath);
    if (!ofs.is_open()) {
        throw std::runtime_error("Cannot open output file: " + filepath);
    }
    ofs << writeToString(network, result);
}

} // namespace contam
