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

std::string JsonWriter::writeTransientToString(const Network& network,
                                                const TransientResult& result,
                                                const std::vector<Species>& species) {
    json j;
    j["completed"] = result.completed;
    j["totalSteps"] = result.history.size();

    // Species info
    json specArr = json::array();
    for (const auto& sp : species) {
        json js;
        js["id"] = sp.id;
        js["name"] = sp.name;
        js["molarMass"] = sp.molarMass;
        specArr.push_back(js);
    }
    j["species"] = specArr;

    // Node info
    json nodeInfo = json::array();
    for (int i = 0; i < network.getNodeCount(); ++i) {
        const auto& node = network.getNode(i);
        json jn;
        jn["id"] = node.getId();
        jn["name"] = node.getName();
        jn["type"] = node.isKnownPressure() ? "ambient" : "normal";
        nodeInfo.push_back(jn);
    }
    j["nodes"] = nodeInfo;

    // Time series
    json timeSeriesArr = json::array();
    for (const auto& step : result.history) {
        json jStep;
        jStep["time"] = step.time;

        // Airflow at this timestep
        jStep["airflow"]["converged"] = step.airflow.converged;
        jStep["airflow"]["iterations"] = step.airflow.iterations;

        // Pressures
        json pressures = json::array();
        for (double p : step.airflow.pressures) {
            pressures.push_back(p);
        }
        jStep["airflow"]["pressures"] = pressures;

        // Mass flows
        json flows = json::array();
        for (double f : step.airflow.massFlows) {
            flows.push_back(f);
        }
        jStep["airflow"]["massFlows"] = flows;

        // Concentrations [nodeIdx][speciesIdx]
        if (!step.contaminant.concentrations.empty()) {
            json concArr = json::array();
            for (const auto& nodeConcs : step.contaminant.concentrations) {
                json nodeArr = json::array();
                for (double c : nodeConcs) {
                    nodeArr.push_back(c);
                }
                concArr.push_back(nodeArr);
            }
            jStep["concentrations"] = concArr;
        }

        timeSeriesArr.push_back(jStep);
    }
    j["timeSeries"] = timeSeriesArr;

    return j.dump(2);
}

void JsonWriter::writeTransientToFile(const std::string& filepath,
                                       const Network& network,
                                       const TransientResult& result,
                                       const std::vector<Species>& species) {
    std::ofstream ofs(filepath);
    if (!ofs.is_open()) {
        throw std::runtime_error("Cannot open output file: " + filepath);
    }
    ofs << writeTransientToString(network, result, species);
}

} // namespace contam
