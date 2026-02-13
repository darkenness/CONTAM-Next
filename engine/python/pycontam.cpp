#include <pybind11/pybind11.h>
#include <pybind11/stl.h>
#include <pybind11/functional.h>

#include "core/Node.h"
#include "core/Link.h"
#include "core/Network.h"
#include "core/Solver.h"
#include "core/Species.h"
#include "core/Schedule.h"
#include "core/ContaminantSolver.h"
#include "core/TransientSimulation.h"
#include "elements/FlowElement.h"
#include "elements/PowerLawOrifice.h"
#include "elements/Fan.h"
#include "elements/TwoWayFlow.h"
#include "elements/Duct.h"
#include "elements/Damper.h"
#include "io/JsonReader.h"
#include "io/JsonWriter.h"

namespace py = pybind11;
using namespace contam;

PYBIND11_MODULE(pycontam, m) {
    m.doc() = "CONTAM-Next: Multi-zone airflow and contaminant transport simulation";

    // ── NodeType ─────────────────────────────────────────────────────
    py::enum_<NodeType>(m, "NodeType")
        .value("Normal", NodeType::Normal)
        .value("Ambient", NodeType::Ambient)
        .export_values();

    // ── Node ─────────────────────────────────────────────────────────
    py::class_<Node>(m, "Node")
        .def(py::init<int, const std::string&, NodeType>(),
             py::arg("id"), py::arg("name") = "Zone", py::arg("type") = NodeType::Normal)
        .def("id", &Node::getId)
        .def("name", &Node::getName)
        .def("type", &Node::getType)
        .def("temperature", &Node::getTemperature)
        .def("set_temperature", &Node::setTemperature)
        .def("elevation", &Node::getElevation)
        .def("set_elevation", &Node::setElevation)
        .def("volume", &Node::getVolume)
        .def("set_volume", &Node::setVolume)
        .def("density", &Node::getDensity)
        .def("__repr__", [](const Node& n) {
            return "<Node id=" + std::to_string(n.getId()) + " name='" + n.getName() + "' type=" +
                   (n.getType() == NodeType::Ambient ? "Ambient" : "Normal") + ">";
        });

    // ── FlowElement (abstract) ───────────────────────────────────────
    py::class_<FlowElement, std::shared_ptr<FlowElement>>(m, "FlowElement")
        .def("type_name", &FlowElement::typeName);

    // ── PowerLawOrifice ──────────────────────────────────────────────
    py::class_<PowerLawOrifice, FlowElement, std::shared_ptr<PowerLawOrifice>>(m, "PowerLawOrifice")
        .def(py::init<double, double>(), py::arg("C"), py::arg("n"))
        .def("flow_coefficient", &PowerLawOrifice::getFlowCoefficient)
        .def("flow_exponent", &PowerLawOrifice::getFlowExponent);

    // ── Fan ──────────────────────────────────────────────────────────
    py::class_<Fan, FlowElement, std::shared_ptr<Fan>>(m, "Fan")
        .def(py::init<double, double>(), py::arg("max_flow"), py::arg("shutoff_pressure"))
        .def("max_flow", &Fan::getMaxFlow)
        .def("shutoff_pressure", &Fan::getShutoffPressure);

    // ── TwoWayFlow ───────────────────────────────────────────────────
    py::class_<TwoWayFlow, FlowElement, std::shared_ptr<TwoWayFlow>>(m, "TwoWayFlow")
        .def(py::init<double, double>(), py::arg("Cd"), py::arg("area"))
        .def("discharge_coefficient", &TwoWayFlow::getDischargeCoefficient)
        .def("area", &TwoWayFlow::getArea);

    // ── Duct ─────────────────────────────────────────────────────────
    py::class_<Duct, FlowElement, std::shared_ptr<Duct>>(m, "Duct")
        .def(py::init<double, double, double, double>(),
             py::arg("length"), py::arg("diameter"),
             py::arg("roughness") = 0.0001, py::arg("sumK") = 0.0)
        .def("length", &Duct::getLength)
        .def("diameter", &Duct::getDiameter)
        .def("roughness", &Duct::getRoughness)
        .def("sum_k", &Duct::getSumK);

    // ── Damper ───────────────────────────────────────────────────────
    py::class_<Damper, FlowElement, std::shared_ptr<Damper>>(m, "Damper")
        .def(py::init<double, double, double>(),
             py::arg("Cmax"), py::arg("n"), py::arg("fraction") = 1.0)
        .def("cmax", &Damper::getCmax)
        .def("flow_exponent", &Damper::getFlowExponent)
        .def("fraction", &Damper::getFraction)
        .def("set_fraction", &Damper::setFraction);

    // ── Network ──────────────────────────────────────────────────────
    // Note: Link is not directly exposed (non-copyable due to unique_ptr).
    // Use Network.add_link() factory and Network.get_link_info() for read access.
    py::class_<Network>(m, "Network")
        .def(py::init<>())
        .def("add_node", &Network::addNode)
        .def("add_link", [](Network& net, int id, int from, int to, double elev,
                            std::shared_ptr<FlowElement> elem) {
            Link link(id, from, to, elev);
            if (elem) link.setFlowElement(elem->clone());
            net.addLink(std::move(link));
        }, py::arg("id"), py::arg("from_node"), py::arg("to_node"),
           py::arg("elevation") = 0.0, py::arg("element") = nullptr)
        .def("node_count", &Network::getNodeCount)
        .def("link_count", &Network::getLinkCount)
        .def("get_node", [](Network& net, int i) -> Node& { return net.getNode(i); },
             py::return_value_policy::reference)
        .def("get_link_info", [](const Network& net, int i) -> py::dict {
            const auto& l = net.getLink(i);
            py::dict d;
            d["id"] = l.getId();
            d["from"] = l.getNodeFrom();
            d["to"] = l.getNodeTo();
            d["elevation"] = l.getElevation();
            d["mass_flow"] = l.getMassFlow();
            if (l.getFlowElement()) d["element_type"] = l.getFlowElement()->typeName();
            return d;
        });

    // ── SolverResult ─────────────────────────────────────────────────
    py::class_<SolverResult>(m, "SolverResult")
        .def_readonly("converged", &SolverResult::converged)
        .def_readonly("iterations", &SolverResult::iterations)
        .def_readonly("max_residual", &SolverResult::maxResidual)
        .def_readonly("pressures", &SolverResult::pressures)
        .def_readonly("mass_flows", &SolverResult::massFlows)
        .def("__repr__", [](const SolverResult& r) {
            return "<SolverResult converged=" + std::string(r.converged ? "True" : "False") +
                   " iterations=" + std::to_string(r.iterations) + ">";
        });

    // ── Solver ───────────────────────────────────────────────────────
    py::class_<Solver>(m, "Solver")
        .def(py::init<>())
        .def("solve", &Solver::solve);

    // ── Species ──────────────────────────────────────────────────────
    py::class_<Species>(m, "Species")
        .def(py::init<>())
        .def_readwrite("id", &Species::id)
        .def_readwrite("name", &Species::name)
        .def_readwrite("molar_mass", &Species::molarMass)
        .def_readwrite("decay_rate", &Species::decayRate)
        .def_readwrite("outdoor_conc", &Species::outdoorConc);

    // ── Source ────────────────────────────────────────────────────────
    py::class_<Source>(m, "Source")
        .def(py::init<>())
        .def_readwrite("zone_id", &Source::zoneId)
        .def_readwrite("species_id", &Source::speciesId)
        .def_readwrite("generation_rate", &Source::generationRate)
        .def_readwrite("removal_rate", &Source::removalRate)
        .def_readwrite("schedule_id", &Source::scheduleId);

    // ── Schedule ─────────────────────────────────────────────────────
    py::class_<SchedulePoint>(m, "SchedulePoint")
        .def(py::init<double, double>(), py::arg("time"), py::arg("value"))
        .def_readwrite("time", &SchedulePoint::time)
        .def_readwrite("value", &SchedulePoint::value);

    py::class_<Schedule>(m, "Schedule")
        .def(py::init<int, const std::string&>(), py::arg("id"), py::arg("name") = "")
        .def("add_point", &Schedule::addPoint)
        .def("get_value", &Schedule::getValue);

    // ── TransientConfig ──────────────────────────────────────────────
    py::class_<TransientConfig>(m, "TransientConfig")
        .def(py::init<>())
        .def_readwrite("start_time", &TransientConfig::startTime)
        .def_readwrite("end_time", &TransientConfig::endTime)
        .def_readwrite("time_step", &TransientConfig::timeStep)
        .def_readwrite("output_interval", &TransientConfig::outputInterval);

    // ── ContaminantResult ────────────────────────────────────────
    py::class_<ContaminantResult>(m, "ContaminantResult")
        .def_readonly("time", &ContaminantResult::time)
        .def_readonly("concentrations", &ContaminantResult::concentrations);

    // ── TimeStepResult ──────────────────────────────────────────────
    py::class_<TimeStepResult>(m, "TimeStepResult")
        .def_readonly("time", &TimeStepResult::time)
        .def_readonly("airflow", &TimeStepResult::airflow)
        .def_readonly("contaminant", &TimeStepResult::contaminant);

    // ── TransientResult ──────────────────────────────────────────
    py::class_<TransientResult>(m, "TransientResult")
        .def_readonly("completed", &TransientResult::completed)
        .def_readonly("history", &TransientResult::history);

    // ── TransientSimulation ──────────────────────────────────────────
    py::class_<TransientSimulation>(m, "TransientSimulation")
        .def(py::init<>())
        .def("run", &TransientSimulation::run);

    // ── JSON I/O convenience functions ───────────────────────────────
    m.def("load_network", &JsonReader::readFromFile,
          "Load a network from a JSON file", py::arg("filepath"));

    m.def("load_network_string", &JsonReader::readFromString,
          "Load a network from a JSON string", py::arg("json_string"));

    m.def("solve_from_json", [](const std::string& json_input) -> std::string {
        Network net = JsonReader::readFromString(json_input);
        Solver solver;
        SolverResult result = solver.solve(net);
        return JsonWriter::writeToString(net, result);
    }, "Solve steady-state from JSON string, return JSON result", py::arg("json_input"));

    m.def("solve_from_file", [](const std::string& input_path, const std::string& output_path) {
        Network net = JsonReader::readFromFile(input_path);
        Solver solver;
        SolverResult result = solver.solve(net);
        JsonWriter::writeToFile(output_path, net, result);
    }, "Solve steady-state from JSON file, write result to file",
       py::arg("input_path"), py::arg("output_path"));

    // Version info
    m.attr("__version__") = "0.1.0";
}
