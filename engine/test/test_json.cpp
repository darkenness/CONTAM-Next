#include <gtest/gtest.h>
#include "io/JsonReader.h"
#include "io/JsonWriter.h"
#include "core/Solver.h"
#include <nlohmann/json.hpp>

using namespace contam;
using json = nlohmann::json;

const std::string SAMPLE_JSON = R"({
    "ambient": {
        "temperature": 283.15,
        "pressure": 0.0,
        "windSpeed": 3.0,
        "windDirection": 180.0
    },
    "flowElements": {
        "crack_small": {
            "type": "PowerLawOrifice",
            "C": 0.001,
            "n": 0.65
        },
        "door_gap": {
            "type": "PowerLawOrifice",
            "C": 0.005,
            "n": 0.5
        }
    },
    "nodes": [
        {
            "id": 0,
            "name": "Outdoor",
            "type": "ambient",
            "temperature": 283.15
        },
        {
            "id": 1,
            "name": "LivingRoom",
            "type": "normal",
            "temperature": 293.15,
            "elevation": 0.0,
            "volume": 60.0
        },
        {
            "id": 2,
            "name": "Bedroom",
            "type": "normal",
            "temperature": 293.15,
            "elevation": 0.0,
            "volume": 30.0
        }
    ],
    "links": [
        {
            "id": 1,
            "from": 0,
            "to": 1,
            "elevation": 1.5,
            "element": "crack_small"
        },
        {
            "id": 2,
            "from": 1,
            "to": 2,
            "elevation": 1.0,
            "element": "door_gap"
        },
        {
            "id": 3,
            "from": 2,
            "to": 0,
            "elevation": 1.5,
            "element": "crack_small"
        }
    ]
})";

TEST(JsonReaderTest, ParseSampleNetwork) {
    auto network = JsonReader::readFromString(SAMPLE_JSON);

    EXPECT_EQ(network.getNodeCount(), 3);
    EXPECT_EQ(network.getLinkCount(), 3);
    EXPECT_EQ(network.getUnknownCount(), 2);

    // Check ambient conditions
    EXPECT_DOUBLE_EQ(network.getAmbientTemperature(), 283.15);
    EXPECT_DOUBLE_EQ(network.getWindSpeed(), 3.0);

    // Check nodes
    EXPECT_EQ(network.getNode(0).getName(), "Outdoor");
    EXPECT_TRUE(network.getNode(0).isKnownPressure());
    EXPECT_EQ(network.getNode(1).getName(), "LivingRoom");
    EXPECT_FALSE(network.getNode(1).isKnownPressure());
    EXPECT_DOUBLE_EQ(network.getNode(1).getVolume(), 60.0);

    // Check links
    EXPECT_EQ(network.getLink(0).getNodeFrom(), 0);
    EXPECT_EQ(network.getLink(0).getNodeTo(), 1);
    EXPECT_NE(network.getLink(0).getFlowElement(), nullptr);
}

TEST(JsonReaderTest, InlineFlowElement) {
    std::string jsonStr = R"({
        "nodes": [
            {"id": 0, "name": "Out", "type": "ambient"},
            {"id": 1, "name": "Room"}
        ],
        "links": [
            {
                "id": 1, "from": 0, "to": 1, "elevation": 1.0,
                "element": {"type": "PowerLawOrifice", "C": 0.002, "n": 0.6}
            }
        ]
    })";

    auto network = JsonReader::readFromString(jsonStr);
    EXPECT_EQ(network.getLinkCount(), 1);
    EXPECT_NE(network.getLink(0).getFlowElement(), nullptr);
}

TEST(JsonWriterTest, OutputHasCorrectStructure) {
    auto network = JsonReader::readFromString(SAMPLE_JSON);

    Solver solver;
    auto result = solver.solve(network);

    std::string output = JsonWriter::writeToString(network, result);
    json j = json::parse(output);

    EXPECT_TRUE(j.contains("solver"));
    EXPECT_TRUE(j["solver"].contains("converged"));
    EXPECT_TRUE(j["solver"].contains("iterations"));

    EXPECT_TRUE(j.contains("nodes"));
    EXPECT_EQ(j["nodes"].size(), 3);

    EXPECT_TRUE(j.contains("links"));
    EXPECT_EQ(j["links"].size(), 3);

    // Check that each node has pressure
    for (auto& node : j["nodes"]) {
        EXPECT_TRUE(node.contains("pressure"));
    }

    // Check that each link has mass flow
    for (auto& link : j["links"]) {
        EXPECT_TRUE(link.contains("massFlow"));
    }
}

TEST(EndToEndTest, SolveFromJson) {
    auto network = JsonReader::readFromString(SAMPLE_JSON);

    Solver solver;
    auto result = solver.solve(network);

    EXPECT_TRUE(result.converged);
    EXPECT_LT(result.maxResidual, CONVERGENCE_TOL);
}
