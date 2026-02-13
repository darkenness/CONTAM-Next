#include "core/Network.h"
#include "core/Solver.h"
#include "io/JsonReader.h"
#include "io/JsonWriter.h"
#include <iostream>
#include <string>

void printUsage(const char* progName) {
    std::cout << "CONTAM-Next Engine v0.1.0\n"
              << "Usage: " << progName << " -i <input.json> -o <output.json> [options]\n"
              << "\nOptions:\n"
              << "  -i <file>    Input topology JSON file (required)\n"
              << "  -o <file>    Output results JSON file (required)\n"
              << "  -m <method>  Solver method: 'sur' or 'tr' (default: tr)\n"
              << "  -v           Verbose output\n"
              << "  -h           Show this help\n";
}

int main(int argc, char* argv[]) {
    std::string inputFile;
    std::string outputFile;
    contam::SolverMethod method = contam::SolverMethod::TrustRegion;
    bool verbose = false;

    // Parse command line arguments
    for (int i = 1; i < argc; ++i) {
        std::string arg = argv[i];
        if (arg == "-i" && i + 1 < argc) {
            inputFile = argv[++i];
        } else if (arg == "-o" && i + 1 < argc) {
            outputFile = argv[++i];
        } else if (arg == "-m" && i + 1 < argc) {
            std::string m = argv[++i];
            if (m == "sur") method = contam::SolverMethod::SubRelaxation;
            else if (m == "tr") method = contam::SolverMethod::TrustRegion;
            else {
                std::cerr << "Unknown solver method: " << m << std::endl;
                return 1;
            }
        } else if (arg == "-v") {
            verbose = true;
        } else if (arg == "-h") {
            printUsage(argv[0]);
            return 0;
        }
    }

    if (inputFile.empty() || outputFile.empty()) {
        printUsage(argv[0]);
        return 1;
    }

    try {
        // Read network
        if (verbose) std::cout << "Reading input: " << inputFile << std::endl;
        auto network = contam::JsonReader::readFromFile(inputFile);

        if (verbose) {
            std::cout << "Network: " << network.getNodeCount() << " nodes, "
                      << network.getLinkCount() << " links\n"
                      << "Unknown pressures: " << network.getUnknownCount() << std::endl;
        }

        // Solve
        contam::Solver solver(method);
        if (verbose) {
            std::cout << "Solving with "
                      << (method == contam::SolverMethod::TrustRegion ? "Trust Region" : "Sub-Relaxation")
                      << " method..." << std::endl;
        }

        auto result = solver.solve(network);

        if (verbose) {
            std::cout << (result.converged ? "Converged" : "FAILED to converge")
                      << " in " << result.iterations << " iterations"
                      << " (max residual: " << result.maxResidual << " kg/s)" << std::endl;
        }

        // Write results
        contam::JsonWriter::writeToFile(outputFile, network, result);
        if (verbose) std::cout << "Results written to: " << outputFile << std::endl;

        return result.converged ? 0 : 2;

    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }
}
