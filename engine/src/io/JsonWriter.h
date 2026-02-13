#pragma once

#include "core/Network.h"
#include "core/Solver.h"
#include <string>

namespace contam {

class JsonWriter {
public:
    // Write solver results to a JSON file
    static void writeToFile(const std::string& filepath,
                            const Network& network,
                            const SolverResult& result);

    // Write solver results to a JSON string
    static std::string writeToString(const Network& network,
                                     const SolverResult& result);
};

} // namespace contam
