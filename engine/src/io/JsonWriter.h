#pragma once

#include "core/Network.h"
#include "core/Solver.h"
#include "core/TransientSimulation.h"
#include "core/Species.h"
#include <string>
#include <vector>

namespace contam {

class JsonWriter {
public:
    // Write steady-state solver results
    static void writeToFile(const std::string& filepath,
                            const Network& network,
                            const SolverResult& result);
    static std::string writeToString(const Network& network,
                                     const SolverResult& result);

    // Write transient simulation results
    static void writeTransientToFile(const std::string& filepath,
                                     const Network& network,
                                     const TransientResult& result,
                                     const std::vector<Species>& species);
    static std::string writeTransientToString(const Network& network,
                                              const TransientResult& result,
                                              const std::vector<Species>& species);
};

} // namespace contam
