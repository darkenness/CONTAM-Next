"""Test pycontam Python API"""
import sys, os, json

# Add build directory to path
build_dir = os.path.join(os.path.dirname(__file__), '..', 'build', 'Release')
sys.path.insert(0, os.path.abspath(build_dir))

import pycontam as pc

print(f"pycontam version: {pc.__version__}")

# ── Test 1: Programmatic API ─────────────────────────────────────────
print("\n=== Test 1: Programmatic API ===")
net = pc.Network()

outdoor = pc.Node(0, "Outdoor", pc.Ambient)
outdoor.set_temperature(283.15)
net.add_node(outdoor)

room = pc.Node(1, "Room")
room.set_temperature(293.15)
room.set_volume(50.0)
net.add_node(room)

crack1 = pc.PowerLawOrifice(0.002, 0.65)
crack2 = pc.PowerLawOrifice(0.002, 0.65)
net.add_link(1, 0, 1, 0.5, crack1)
net.add_link(2, 1, 0, 2.5, crack2)

print(f"Network: {net.node_count()} nodes, {net.link_count()} links")
assert net.node_count() == 2
assert net.link_count() == 2

solver = pc.Solver()
result = solver.solve(net)
print(f"Converged: {result.converged}, iterations: {result.iterations}")
print(f"Pressures: {result.pressures}")
print(f"Mass flows: {result.mass_flows}")
assert result.converged
print("PASSED")

# ── Test 2: All element types ─────────────────────────────────────────
print("\n=== Test 2: All element types ===")
plo = pc.PowerLawOrifice(0.001, 0.65)
print(f"PowerLawOrifice: C={plo.flow_coefficient()}, n={plo.flow_exponent()}")

fan = pc.Fan(0.05, 200)
print(f"Fan: maxFlow={fan.max_flow()}, shutoff={fan.shutoff_pressure()}")

twf = pc.TwoWayFlow(0.65, 1.0)
print(f"TwoWayFlow: Cd={twf.discharge_coefficient()}, area={twf.area()}")

duct = pc.Duct(5.0, 0.2, 0.0001, 2.0)
print(f"Duct: L={duct.length()}, D={duct.diameter()}, eps={duct.roughness()}, sumK={duct.sum_k()}")

damper = pc.Damper(0.005, 0.65, 0.7)
print(f"Damper: Cmax={damper.cmax()}, n={damper.flow_exponent()}, fraction={damper.fraction()}")
damper.set_fraction(0.3)
assert abs(damper.fraction() - 0.3) < 1e-10
print("PASSED")

# ── Test 3: solve_from_json ───────────────────────────────────────────
print("\n=== Test 3: solve_from_json ===")
json_input = json.dumps({
    "ambient": {"temperature": 283.15, "pressure": 0, "windSpeed": 0, "windDirection": 0},
    "nodes": [
        {"id": 0, "name": "Out", "type": "ambient", "temperature": 283.15},
        {"id": 1, "name": "Room", "type": "normal", "temperature": 293.15, "volume": 50}
    ],
    "links": [
        {"id": 1, "from": 0, "to": 1, "elevation": 0.5,
         "element": {"type": "PowerLawOrifice", "C": 0.002, "n": 0.65}},
        {"id": 2, "from": 1, "to": 0, "elevation": 2.5,
         "element": {"type": "PowerLawOrifice", "C": 0.002, "n": 0.65}}
    ]
})
result_json = pc.solve_from_json(json_input)
parsed = json.loads(result_json)
print(f"Converged: {parsed['solver']['converged']}")
print(f"Room pressure: {parsed['nodes'][1]['pressure']:.4f} Pa")
assert parsed["solver"]["converged"]
print("PASSED")

# ── Test 4: Fan + Duct network ────────────────────────────────────────
print("\n=== Test 4: Fan + Duct network ===")
net2 = pc.Network()
out2 = pc.Node(0, "Outdoor", pc.Ambient)
out2.set_temperature(293.15)
net2.add_node(out2)

rm2 = pc.Node(1, "Room")
rm2.set_temperature(293.15)
rm2.set_volume(50.0)
net2.add_node(rm2)

net2.add_link(1, 0, 1, 1.5, pc.Fan(0.05, 200))
net2.add_link(2, 1, 0, 1.5, pc.Duct(3.0, 0.15))

solver2 = pc.Solver()
r2 = solver2.solve(net2)
print(f"Converged: {r2.converged}, Room P={r2.pressures[1]:.2f} Pa")
assert r2.converged
assert r2.pressures[1] > 0  # room pressurized by fan
print("PASSED")

# ── Test 5: load_network from file ────────────────────────────────────
print("\n=== Test 5: load_network from file ===")
case01_path = os.path.join(os.path.dirname(__file__), '..', '..', 'validation', 'case01_3room', 'input.json')
if os.path.exists(case01_path):
    net3 = pc.load_network(os.path.abspath(case01_path))
    print(f"Loaded: {net3.node_count()} nodes, {net3.link_count()} links")
    r3 = pc.Solver().solve(net3)
    print(f"Converged: {r3.converged}")
    assert r3.converged
    print("PASSED")
else:
    print(f"SKIPPED (file not found: {case01_path})")

print("\n✓ All Python API tests PASSED!")
