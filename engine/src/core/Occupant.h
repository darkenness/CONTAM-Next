#pragma once

#include <string>
#include <vector>

namespace contam {

// Occupant exposure tracking
// Tracks cumulative inhalation dose and peak concentration for each species
struct ExposureRecord {
    int speciesIdx;
    double cumulativeDose;      // kg (total inhaled mass)
    double peakConcentration;   // kg/m³ (maximum concentration encountered)
    double timeAtPeak;          // s (time when peak occurred)
    double totalExposureTime;   // s (total time in non-zero concentration)
};

// Occupant: a person moving between zones with breathing rate
class Occupant {
public:
    int id;
    std::string name;
    int currentZoneIdx;         // which zone (node index) the occupant is in
    double breathingRate;       // m³/s (typical: 1.2e-4 = 7.2 L/min at rest)
    int scheduleId;             // zone schedule ID (-1 = always in currentZone)

    std::vector<ExposureRecord> exposure; // one per species

    Occupant() : id(0), currentZoneIdx(0), breathingRate(1.2e-4), scheduleId(-1) {}
    Occupant(int id, const std::string& name, int zoneIdx, double breathRate = 1.2e-4)
        : id(id), name(name), currentZoneIdx(zoneIdx), breathingRate(breathRate), scheduleId(-1) {}

    // Initialize exposure records for given number of species
    void initExposure(int numSpecies) {
        exposure.clear();
        for (int i = 0; i < numSpecies; ++i) {
            exposure.push_back({i, 0.0, 0.0, 0.0, 0.0});
        }
    }

    // Update exposure based on current concentrations at time t with timestep dt
    // concentrations[speciesIdx] = current concentration in occupant's zone (kg/m³)
    void updateExposure(const std::vector<double>& zoneConcentrations, double t, double dt) {
        for (auto& rec : exposure) {
            if (rec.speciesIdx >= (int)zoneConcentrations.size()) continue;
            double conc = zoneConcentrations[rec.speciesIdx];

            // Cumulative dose = breathing_rate * concentration * time
            rec.cumulativeDose += breathingRate * conc * dt;

            // Peak tracking
            if (conc > rec.peakConcentration) {
                rec.peakConcentration = conc;
                rec.timeAtPeak = t;
            }

            // Exposure time
            if (conc > 1e-15) {
                rec.totalExposureTime += dt;
            }
        }
    }
};

} // namespace contam
