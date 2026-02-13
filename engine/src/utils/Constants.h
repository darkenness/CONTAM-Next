#pragma once

namespace contam {

// Physical constants
constexpr double GRAVITY = 9.80665;          // m/s^2
constexpr double R_AIR = 287.055;            // J/(kg·K), specific gas constant for dry air
constexpr double P_ATM = 101325.0;           // Pa, standard atmospheric pressure
constexpr double T_REF = 293.15;             // K, reference temperature (20°C)

// Solver parameters
constexpr double CONVERGENCE_TOL = 1.0e-5;   // kg/s, max residual for convergence
constexpr int    MAX_ITERATIONS = 100;        // max Newton-Raphson iterations
constexpr double DP_MIN = 0.001;             // Pa, threshold for linearization
constexpr double RELAX_FACTOR_SUR = 0.75;    // sub-relaxation factor

// Trust region parameters
constexpr double TR_INITIAL_RADIUS = 1000.0; // Pa, initial trust region radius
constexpr double TR_MIN_RADIUS = 0.01;       // Pa, minimum trust region radius
constexpr double TR_MAX_RADIUS = 1.0e6;      // Pa, maximum trust region radius
constexpr double TR_ETA1 = 0.25;             // threshold for step rejection
constexpr double TR_ETA2 = 0.75;             // threshold for radius expansion

} // namespace contam
