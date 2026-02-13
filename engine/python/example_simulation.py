"""
CONTAM-Next Python API Example
===============================
Demonstrates building a multi-zone model, solving airflow,
and analyzing results using the pycontam Python bindings.
"""
import sys, os, json

# Add build directory to path
build_dir = os.path.join(os.path.dirname(__file__), '..', 'build', 'Release')
sys.path.insert(0, os.path.abspath(build_dir))

import pycontam as pc

print(f"pycontam v{pc.__version__}\n")

# ── Build a 2-room office model ──────────────────────────────────────
net = pc.Network()

# Outdoor node
outdoor = pc.Node(0, "室外", pc.Ambient)
outdoor.set_temperature(278.15)  # 5°C
net.add_node(outdoor)

# Office A - warm
office_a = pc.Node(1, "办公室A")
office_a.set_temperature(295.15)  # 22°C
office_a.set_volume(45.0)
net.add_node(office_a)

# Office B - slightly cooler
office_b = pc.Node(2, "办公室B")
office_b.set_temperature(293.15)  # 20°C
office_b.set_volume(55.0)
net.add_node(office_b)

# Supply fan into Office A
net.add_link(1, 0, 1, 2.5, pc.Fan(0.06, 250))

# Door between offices (large opening)
net.add_link(2, 1, 2, 1.0, pc.TwoWayFlow(0.65, 0.02))

# Exhaust duct from Office B
net.add_link(3, 2, 0, 2.5, pc.Duct(6.0, 0.18, 0.0001, 2.0))

# Facade crack on Office A
net.add_link(4, 1, 0, 0.5, pc.PowerLawOrifice(0.001, 0.65))

print(f"模型: {net.node_count()} 个节点, {net.link_count()} 条路径")

# ── Solve steady-state airflow ────────────────────────────────────────
solver = pc.Solver()
result = solver.solve(net)

print(f"\n{'='*50}")
print(f"稳态求解结果")
print(f"{'='*50}")
print(f"收敛: {result.converged}  迭代: {result.iterations}")
print(f"最大残差: {result.max_residual:.2e} kg/s\n")

node_names = ["室外", "办公室A", "办公室B"]
print(f"{'节点':<12} {'压力 (Pa)':>12}")
print("-" * 26)
for i, name in enumerate(node_names):
    print(f"{name:<12} {result.pressures[i]:>12.4f}")

print(f"\n{'路径':<12} {'质量流量 (g/s)':>16}")
print("-" * 30)
link_names = ["供风风扇", "办公室间门", "排风管道", "外墙裂缝"]
for i, name in enumerate(link_names):
    print(f"{name:<12} {result.mass_flows[i]*1000:>16.4f}")

# ── Solve from JSON string ────────────────────────────────────────────
print(f"\n{'='*50}")
print(f"JSON API 示例")
print(f"{'='*50}")

model = {
    "ambient": {"temperature": 283.15, "pressure": 0, "windSpeed": 0, "windDirection": 0},
    "nodes": [
        {"id": 0, "name": "Out", "type": "ambient", "temperature": 283.15},
        {"id": 1, "name": "Room", "type": "normal", "temperature": 293.15, "volume": 50}
    ],
    "links": [
        {"id": 1, "from": 0, "to": 1, "elevation": 0.5,
         "element": {"type": "Fan", "maxFlow": 0.05, "shutoffPressure": 200}},
        {"id": 2, "from": 1, "to": 0, "elevation": 2.5,
         "element": {"type": "Duct", "length": 4, "diameter": 0.15}}
    ]
}

result_str = pc.solve_from_json(json.dumps(model))
parsed = json.loads(result_str)
print(f"收敛: {parsed['solver']['converged']}")
print(f"房间压力: {parsed['nodes'][1]['pressure']:.2f} Pa")
print(f"风扇流量: {parsed['links'][0]['massFlow']*1000:.4f} g/s")

print(f"\n完成!")
