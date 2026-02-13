#pragma once

#include "core/Network.h"
#include <string>

namespace contam {

class JsonReader {
public:
    // Parse a JSON topology file and build a Network
    static Network readFromFile(const std::string& filepath);
    static Network readFromString(const std::string& jsonStr);
};

} // namespace contam
