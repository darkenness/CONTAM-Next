# CONTAM-Next 算法与数学公式文档

> 版本 1.0 | 2026-02-14
>
> 本文档整理 CONTAM-Next 引擎中所有已实现算法的数学公式，与 C++ 源码一一对应。
> 参照《CONTAM 功能复现 — 需求文档》编写。

---

## 目录

1. [气流求解器](#1-气流求解器)
2. [气流元件模型库](#2-气流元件模型库)
3. [污染物传输求解器](#3-污染物传输求解器)
4. [污染源/汇模型](#4-污染源汇模型)
5. [控制系统](#5-控制系统)
6. [高级源汇模型](#6-高级源汇模型)
7. [化学动力学与复合过滤](#7-化学动力学与复合过滤)
8. [人员暴露评估](#8-人员暴露评估)
9. [主程序循环结构](#9-主程序循环结构)

---

## 1. 气流求解器

> 源码：`engine/src/core/Solver.cpp`, `engine/src/core/Solver.h`

### 1.1 控制方程

每个节点 $i$ 的质量守恒残差：

$$R_i(P_1, P_2, \ldots, P_N) = \sum_{j \in \text{links}(i)} \dot{m}_{i,j} = 0$$

$N$ 个未知节点 → $N$ 个非线性方程。

### 1.2 牛顿-拉夫逊迭代

$$\mathbf{J} \cdot \Delta\mathbf{P} = -\mathbf{R}$$

**雅可比矩阵装配规则**（`assembleSystem()`）：

$$J_{i,i} = -\sum_{j} d_{i,j} \qquad J_{i,k} = d_{i,k}$$

其中 $d_{i,j} = \frac{\partial \dot{m}}{\partial (\Delta P)}$ 为各气流元件的解析偏导数。

**残差装配**：

$$R_i \mathrel{-}= \dot{m}_k \quad (\text{node } i \text{ 为路径出发端})$$
$$R_j \mathrel{+}= \dot{m}_k \quad (\text{node } j \text{ 为路径到达端})$$

**收敛判据**：

$$\|\mathbf{R}\|_\infty < 10^{-5} \text{ kg/s}$$

### 1.3 真实压差计算

> 源码：`Solver::computeDeltaP()`

$$\Delta P_k = \left(P_i - \rho_i \cdot g \cdot (Z_k - Z_i)\right) - \left(P_j - \rho_j \cdot g \cdot (Z_k - Z_j)\right)$$

- $Z_k$：路径标高
- $Z_i, Z_j$：节点标高
- $g = 9.80665$ m/s²

**密度计算**（理想气体状态方程）：

$$\rho = \frac{P_{\text{abs}}}{R_{\text{air}} \cdot T}$$

- $R_{\text{air}} = 287.055$ J/(kg·K)
- $P_{\text{abs}} = 101325$ Pa（标准大气压）

### 1.4 N-R 迭代策略

#### 模式 A：亚松弛法（SUR）

> 源码：`Solver::applyUpdateSUR()`

$$P_{\text{new}} = P_{\text{old}} + \alpha \cdot \Delta P$$

- 松弛因子 $\alpha$，默认 0.75

#### 模式 B：信赖域法（Trust Region）

> 源码：`Solver::applyUpdateTR()`

$$\text{scale} = \min\left(1, \; \frac{r_{\text{trust}}}{\|\Delta\mathbf{P}\|}\right)$$

$$P_{\text{new}} = P_{\text{old}} + \text{scale} \cdot \Delta P$$

**自适应半径调整**：
- 步长被截断（scale < 1）→ $r_{\text{trust}} \leftarrow r_{\text{trust}} \times 0.5$，但 $\geq r_{\min} = 0.1$ Pa
- 全步接受（scale = 1）→ $r_{\text{trust}} \leftarrow r_{\text{trust}} \times 2.0$，但 $\leq r_{\max} = 10^6$ Pa

### 1.5 稀疏线性方程组求解器

> 源码：`Solver::solve()` 中的自动切换逻辑

| 条件 | 求解器 | 预处理 |
|------|--------|--------|
| 未知数 $n \leq 50$ | **SparseLU**（直接法） | — |
| 未知数 $n > 50$ | **BiCGSTAB**（迭代法） | IncompleteLUT |
| BiCGSTAB 失败 | **SparseLU** 降级 | — |

BiCGSTAB 参数：`maxIterations = 1000`，`tolerance = 10^{-10}`

### 1.6 Reverse Cuthill-McKee (RCM) 节点重排序

> 源码：`Solver::computeRCMOrdering()`

目的：压缩雅可比矩阵带宽，提升稀疏分解效率。

算法：
1. 找最小度数节点作为起始节点
2. BFS 遍历，每层按度数升序排列邻居
3. 将 BFS 序列反转得到 RCM 排列

### 1.7 零压差线性化

所有元件在 $|\Delta P| < \Delta P_{\min}$ 时切换为线性模式：

$$\dot{m} = C_{\text{lin}} \cdot \Delta P$$

$$\frac{\partial \dot{m}}{\partial (\Delta P)} = C_{\text{lin}}$$

其中 $\Delta P_{\min} = 0.001$ Pa，线性斜率由各元件在边界处的弦斜率计算确保连续性。

---

## 2. 气流元件模型库

> 每种元件实现两个接口：流量 $\dot{m}(\Delta P)$ 和偏导数 $d = \frac{\partial \dot{m}}{\partial (\Delta P)}$

### 2.1 幂律孔口（PowerLawOrifice）

> 源码：`engine/src/elements/PowerLawOrifice.cpp`

**流量公式**：

$$\dot{m} = \rho \cdot C \cdot |\Delta P|^n \cdot \text{sign}(\Delta P)$$

**解析偏导数**：

$$d = \rho \cdot n \cdot C \cdot |\Delta P|^{n-1}$$

**参数范围**：
- 流动系数 $C > 0$
- 流动指数 $n \in [0.5, 1.0]$（湍流 0.5，层流 1.0）

**零压差线性化**（$|\Delta P| < 0.001$ Pa）：

$$C_{\text{lin}} = \rho \cdot C \cdot \Delta P_{\min}^{n-1}$$

### 2.2 Brown-Solvason 双向流大开口（TwoWayFlow）

> 源码：`engine/src/elements/TwoWayFlow.cpp`

#### 单向模式（$|\rho_i - \rho_j| < 10^{-6}$）

退化为大开口单向孔口：

$$\dot{m} = \rho \cdot C_d \cdot A \cdot \sqrt{\frac{2|\Delta P|}{\rho}} \cdot \text{sign}(\Delta P)$$

$$d = \frac{1}{2} \cdot C_d \cdot A \cdot \sqrt{\frac{2\rho}{|\Delta P|}}$$

#### 双向模式（密度差 $\Delta\rho = \rho_i - \rho_j$ 显著）

**中性压力面高度**：

$$Z_{\text{np}} = Z_{\text{link}} - \frac{\Delta P}{\Delta\rho \cdot g}$$

当 $Z_{\text{np}}$ 位于开口内部（$Z_{\text{bot}} < Z_{\text{np}} < Z_{\text{top}}$）时启用双向积分。

**微元压差分布**：

$$\Delta P(z) = \Delta P + \Delta\rho \cdot g \cdot (z - Z_{\text{link}})$$

**分段积分**：

中性面下方（$Z_{\text{bot}}$ 到 $Z_{\text{np}}$），高度差 $h_{\text{below}} = Z_{\text{np}} - Z_{\text{bot}}$：

$$\dot{m}_{\text{below}} = C_d \cdot W \cdot \rho_i \cdot \sqrt{\frac{2 |\Delta\rho \cdot g|}{\rho_i}} \cdot \frac{2}{3} \cdot h_{\text{below}}^{3/2}$$

中性面上方（$Z_{\text{np}}$ 到 $Z_{\text{top}}$），高度差 $h_{\text{above}} = Z_{\text{top}} - Z_{\text{np}}$：

$$\dot{m}_{\text{above}} = C_d \cdot W \cdot \rho_j \cdot \sqrt{\frac{2 |\Delta\rho \cdot g|}{\rho_j}} \cdot \frac{2}{3} \cdot h_{\text{above}}^{3/2}$$

**流向判定**：
- $\Delta\rho > 0$（区域 $i$ 更冷更密）：下方 $i \to j$，上方 $j \to i$
- $\Delta\rho < 0$（区域 $j$ 更冷更密）：下方 $j \to i$，上方 $i \to j$

**净质量流率**：

$$\dot{m}_{\text{net}} = \dot{m}_{i \to j} - \dot{m}_{j \to i}$$

**偏导数**：通过中性面对 $\Delta P$ 的灵敏度数值微分：

$$d \approx \frac{|\dot{m}_{\text{net}}(\Delta P + \varepsilon) - \dot{m}_{\text{net}}(\Delta P)|}{\varepsilon}$$

### 2.3 风扇（Fan）

> 源码：`engine/src/elements/Fan.cpp`

#### 线性模式

$$Q = Q_{\max} \cdot \left(1 - \frac{\Delta P}{P_{\text{shutoff}}}\right), \quad Q \geq 0$$

$$\dot{m} = \rho \cdot Q$$

$$d = \frac{\partial \dot{m}}{\partial (\Delta P)} = -\frac{\rho \cdot Q_{\max}}{P_{\text{shutoff}}}$$

#### 多项式性能曲线模式

性能曲线：

$$\Delta P_{\text{fan}}(Q) = a_0 + a_1 Q + a_2 Q^2 + a_3 Q^3 + \cdots$$

**反解流量**：给定外部 $\Delta P$，牛顿迭代求解 $Q$：

$$f(Q) = \Delta P_{\text{fan}}(Q) - \Delta P = 0$$

$$Q_{k+1} = Q_k - \frac{f(Q_k)}{f'(Q_k)}$$

其中 $f'(Q) = a_1 + 2a_2 Q + 3a_3 Q^2 + \cdots$

**逆向解析偏导数**（避免反曲点奇异）：

$$\frac{\partial Q}{\partial (\Delta P)} = \frac{1}{\frac{\partial (\Delta P_{\text{fan}})}{\partial Q}}$$

### 2.4 风管（Duct）— Darcy-Weisbach

> 源码：`engine/src/elements/Duct.cpp`

**总压降**：

$$\Delta P = \left(f \cdot \frac{L}{D_h} + \sum K\right) \cdot \frac{\rho V^2}{2}$$

- $L$：管道长度
- $D_h$：水力直径
- $\sum K$：局部损失系数之和
- $A = \pi D_h^2 / 4$：截面积

**反解流速**：

$$V = \sqrt{\frac{2 |\Delta P|}{\rho \cdot (f \cdot L/D_h + \sum K)}}$$

**摩擦系数 $f$**：

层流（$Re < 2300$）：

$$f = \frac{64}{Re}$$

湍流（$Re \geq 2300$，Swamee-Jain 显式近似）：

$$f = \frac{0.25}{\left[\log_{10}\left(\frac{\varepsilon/D_h}{3.7} + \frac{5.74}{Re^{0.9}}\right)\right]^2}$$

**雷诺数**：

$$Re = \frac{\rho \cdot V \cdot D_h}{\mu}$$

- $\mu = 1.81 \times 10^{-5}$ Pa·s（空气动力粘度 @20°C）

**迭代求解**：$f$ 和 $V$ 互相依赖，采用 10 次内循环迭代至 $|f_{\text{new}} - f_{\text{old}}| < 10^{-6}$ 收敛。

**偏导数**：

$$d = \frac{|\dot{m}|}{2 |\Delta P|}$$

### 2.5 风阀（Damper）

> 源码：`engine/src/elements/Damper.cpp`

本质是可变面积的幂律孔口，通过开度系数 $\text{fraction} \in [0, 1]$ 控制有效流动系数：

$$C_{\text{eff}} = C_{\max} \cdot \text{fraction}$$

$$\dot{m} = \rho \cdot C_{\text{eff}} \cdot |\Delta P|^n \cdot \text{sign}(\Delta P)$$

$$d = \rho \cdot n \cdot C_{\text{eff}} \cdot |\Delta P|^{n-1}$$

当 $\text{fraction} = 0$ 时，$\dot{m} = 0$，$d = 10^{-15}$（数值保护）。

### 2.6 过滤器（Filter）

> 源码：`engine/src/elements/Filter.cpp`

**气流阻力**：幂律模型（与 PowerLawOrifice 相同）

$$\dot{m} = \rho \cdot C \cdot |\Delta P|^n \cdot \text{sign}(\Delta P)$$

**污染物去除**：通过效率 $\eta \in [0, 1]$，在污染物传输矩阵中作用：

$$C_{\text{out}} = (1 - \eta) \cdot C_{\text{in}}$$

### 2.7 自调节通风口（SelfRegulatingVent）

> 源码：`engine/src/elements/SelfRegulatingVent.cpp`

分三段压差区间：

**缓升区域**（$|\Delta P| < P_{\min}$）：线性增长

$$Q = Q_{\text{target}} \cdot \frac{|\Delta P|}{P_{\min}}, \quad d = \frac{\rho \cdot Q_{\text{target}}}{P_{\min}}$$

**调节区域**（$P_{\min} \leq |\Delta P| \leq P_{\max}$）：恒定流量

$$Q = Q_{\text{target}}, \quad d \approx \rho \cdot 10^{-8}$$

**溢出区域**（$|\Delta P| > P_{\max}$）：平方根增长

$$Q = Q_{\text{target}} \cdot \sqrt{\frac{|\Delta P|}{P_{\max}}}$$

$$d = \frac{\rho \cdot Q_{\text{target}}}{2\sqrt{|\Delta P| \cdot P_{\max}}}$$

所有区域：$\dot{m} = \rho \cdot Q \cdot \text{sign}(\Delta P)$

### 2.8 单向阀（CheckValve）

> 源码：`engine/src/elements/CheckValve.cpp`

**正向**（$\Delta P > 0$）：幂律孔口

$$\dot{m} = \rho \cdot C \cdot |\Delta P|^n, \quad d = \rho \cdot n \cdot C \cdot |\Delta P|^{n-1}$$

**反向**（$\Delta P \leq 0$）：完全封堵

$$\dot{m} = 0, \quad d = \rho \cdot 10^{-12}$$

---

## 3. 污染物传输求解器

> 源码：`engine/src/core/ContaminantSolver.cpp`

### 3.1 质量平衡 ODE

$$M_i \frac{dC_{i,\alpha}}{dt} = \sum_{j} \dot{m}_{j \to i} \cdot C_{j,\alpha} - \sum_{j} \dot{m}_{i \to j} \cdot C_{i,\alpha} + G_{i,\alpha} - R_{i,\alpha} \cdot C_{i,\alpha}$$

- $M_i = \rho_i \cdot V_i$：区域 $i$ 的空气质量
- $G_{i,\alpha}$：纯生成率（kg/s）
- $R_{i,\alpha}$：浓度依赖去除率系数

### 3.2 隐式欧拉离散化

$$[A] \cdot \mathbf{C}^{t+\Delta t} = [\mathbf{b}]$$

**矩阵 $[A]$ 装配**：

对角线项：

$$A_{i,i} = \frac{V_i}{\Delta t} + \sum_{j} Q_{\text{out},j} + R_i \cdot V_i + \lambda_\alpha \cdot V_i$$

- $Q_{\text{out},j} = \dot{m}_{i \to j} / \rho_i$：从节点 $i$ 流出的体积流率
- $\lambda_\alpha$：一阶自然衰减率

非对角线项（入流）：

$$A_{i,j} = -Q_{\text{in},j} \quad (\text{从非环境节点 } j \text{ 流入 } i)$$

**右侧向量 $[\mathbf{b}]$ 装配**：

$$b_i = \frac{V_i}{\Delta t} \cdot C_i^t + G_i + \sum_{j \in \text{ambient}} Q_{\text{in},j} \cdot C_{j,\text{outdoor}}$$

### 3.3 矩阵装配关键规则

| 项目 | 位置 | 说明 |
|------|------|------|
| 纯生成源 $G_i$ | → 右侧 $[\mathbf{b}]$ | 不依赖 $C^{t+\Delta t}$ |
| 浓度依赖去除 $R \cdot C$ | → 对角线 $A_{i,i}$ | 提取系数 $R$ 加入矩阵保证隐式稳定 |
| 流出项 | → 对角线 $A_{i,i}$ | 隐式处理 $C_i^{t+\Delta t}$ |
| 流入项（非环境） | → 非对角线 $A_{i,j}$ | 隐式耦合 |
| 流入项（环境） | → 右侧 $[\mathbf{b}]$ | 环境浓度已知 |

⚠️ 将浓度依赖项错放到 $[\mathbf{b}]$ 会导致数值震荡或发散。

### 3.4 非痕量污染物密度反馈耦合

> 源码：`TransientSimulation::updateDensitiesFromConcentrations()`

当存在非痕量物种（`isTrace = false`）时：

**混合气体常数**：

$$R_{\text{mix}} = \frac{\sum_\alpha (x_\alpha / M_\alpha)}{\sum_\alpha x_\alpha} \cdot R_u$$

- $x_\alpha$：物种 $\alpha$ 的质量分数
- $M_\alpha$：摩尔质量
- $R_u = 8314.46$ J/(kmol·K)

**密度更新**：

$$\rho_{\text{new}} = \frac{P_{\text{abs}}}{R_{\text{mix}} \cdot T}$$

每个瞬态时间步内：气流求解 → 污染物求解 → 密度更新 → 重新气流求解（联合收敛）。

---

## 4. 污染源/汇模型

> 源码：`engine/src/core/Species.h`, `ContaminantSolver.cpp`

### 4.1 恒定系数源汇（Constant）

$$S_\alpha = G_\alpha \cdot f_{\text{sched}}(t) - R_\alpha \cdot C_\alpha \cdot V_i$$

- $G_\alpha$：基础生成率（kg/s）
- $R_\alpha$：一阶去除率系数（1/s）
- $f_{\text{sched}}(t)$：排程乘数

### 4.2 指数衰减源（ExponentialDecay）

$$S(t) = \text{mult} \cdot G_0 \cdot e^{-(t - t_0) / \tau_c} \cdot f_{\text{sched}}(t)$$

- $\text{mult}$：倍率乘数
- $G_0$：初始生成率
- $\tau_c$：衰减时间常数
- $t_0$：源启动时间

适用场景：液体溢出挥发、喷洒气溶胶。

### 4.3 压力驱动源（PressureDriven）

$$G = k_P \cdot |P_{\text{zone}}| \cdot f_{\text{sched}}(t)$$

- $k_P$：压力系数（kg/(s·Pa)）
- $P_{\text{zone}}$：区域表压

适用场景：土壤气体（氡）穿透地基。

### 4.4 浓度切断源（CutoffConcentration）

$$G = \begin{cases} G_0 \cdot f_{\text{sched}}(t) & \text{if } C_\alpha < C_{\text{cutoff}} \\ 0 & \text{if } C_\alpha \geq C_{\text{cutoff}} \end{cases}$$

适用场景：恒温箱释放、达到饱和浓度后停止。

### 4.5 排程系统（Schedule）

**线性插值**：

$$f_{\text{sched}}(t) = v_k + \frac{v_{k+1} - v_k}{t_{k+1} - t_k} \cdot (t - t_k), \quad t \in [t_k, t_{k+1})$$

使用线性查找定位当前区间。

---

## 5. 控制系统

> 源码：`engine/src/control/Controller.h`, `Sensor.h`, `Actuator.h`

### 5.1 传感器（Sensor）

$$\text{reading} = C_{\text{zone}}^t \quad \text{或} \quad P_{\text{zone}}^t \quad \text{或} \quad T_{\text{zone}}$$

### 5.2 增量式 PI 控制器（Controller）

> 严格遵循 CONTAM 标准增量式 PI 公式

**误差信号**：

$$e_t = \text{setpoint} - \text{sensorValue}$$

**死区逻辑**：

$$e_t = \begin{cases} 0 & \text{if } |e_t| < \text{deadband} \\ e_t & \text{otherwise} \end{cases}$$

**增量控制公式**：

$$\text{output}_t = \text{output}_{t-1} + K_p \cdot (e_t - e_{t-1}) + K_i \cdot (e_t + e_{t-1})$$

- $K_p$：比例增益
- $K_i$：积分增益（已吸收 $\Delta t / 2$ 因子）
- 积分项 $K_i \cdot (e_t + e_{t-1})$ 本质为梯形近似积分

**输出限幅**（硬截断）：

$$\text{output}_t = \text{clamp}(\text{output}_t, \; 0, \; 1)$$

### 5.3 执行器（Actuator）

将控制器输出映射到元件物理属性：

$$\text{fraction}_{\text{damper}} = \text{output}_t$$

### 5.4 控制循环集成

每个瞬态时间步内：

$$\text{Sensors} \xrightarrow{\text{读取}} \text{Controllers} \xrightarrow{\text{PI}} \text{Actuators} \xrightarrow{\text{修改}} \text{气流元件} \xrightarrow{\text{N-R}} \text{重新收敛}$$

---

## 6. 高级源汇模型

### 6.1 Axley 边界层扩散与可逆吸附

> 源码：`engine/src/core/AxleyBLD.h`

**表面传递速率**：

$$S_\alpha(t) = h \cdot \rho_{\text{film}} \cdot A_s \cdot \left[C_\alpha(t) - \frac{C_s(t)}{k}\right]$$

- $h$：边界层对流质量转移系数（m/s）
- $\rho_{\text{film}}$：薄膜空气等效密度（取主流与近表面算术平均）
- $A_s$：吸附剂暴露表面积（m²）
- $C_s(t)$：固相等效浓度（状态变量，动态追踪）
- $k$：亨利常数 / 分配系数

**固相浓度更新**（隐式欧拉）：

$$C_s^{t+\Delta t} = C_s^t + \frac{h \cdot \rho_{\text{film}} \cdot A_s}{V_s} \cdot \left[C_\alpha^{t+\Delta t} - \frac{C_s^t}{k}\right] \cdot \Delta t$$

- $V_s$：固相等效体积

**动态状态反转**：
- $C_\alpha > C_s / k$ → 吸附（汇，$S > 0$ 从气相移除）
- $C_\alpha < C_s / k$ → 解吸（源，$S < 0$ 释放回气相）

### 6.2 气溶胶沉积与重悬浮

> 源码：`engine/src/core/AerosolDeposition.h`

**沉积去除率**：

$$R_{\text{dep}} = d \cdot A_s \cdot C_\alpha$$

- $d$：粒径沉积速度（m/s）
- $A_s$：沉积表面积（m²）

**表面质量累积**：

$$M_s^{t+\Delta t} = M_s^t + d \cdot A_s \cdot C_\alpha \cdot \Delta t - r \cdot M_s^t \cdot \Delta t$$

**重悬浮速率**：

$$G_{\text{resuspension}} = r \cdot M_s$$

- $r$：重悬浮率系数（1/s）

**质量守恒**：$\Delta M_{\text{air}} + \Delta M_{\text{surface}} = 0$

---

## 7. 化学动力学与复合过滤

### 7.1 一阶化学动力学反应矩阵

> 源码：`engine/src/core/ChemicalKinetics.h`

**反应网络**：物种间伪一阶反应速率

$$\frac{\partial C_\alpha}{\partial t}\bigg|_{\text{chem}} = \sum_{\beta} K_{\alpha,\beta} \cdot C_\beta$$

- $K_{\alpha,\beta} > 0$：物种 $\beta$ 生成物种 $\alpha$ 的速率
- $K_{\alpha,\alpha} < 0$：物种 $\alpha$ 的自消耗速率

**矩阵嵌入**（隐式积分器）：
- 自消耗项（对角线）：$A_{i_\alpha, i_\alpha} \mathrel{+}= |K_{\alpha,\alpha}| \cdot V_i$
- 跨物种产生项（非对角线）：$A_{i_\alpha, i_\beta} \mathrel{-}= K_{\alpha,\beta} \cdot V_i$

### 7.2 耦合多物种求解器

> 源码：`ContaminantSolver::solveCoupled()`

当存在化学反应网络时，所有物种耦合到一个大型矩阵系统：

$$[A_{\text{block}}]_{N_z \cdot N_s \times N_z \cdot N_s} \cdot \mathbf{C}_{\text{all}}^{t+\Delta t} = \mathbf{b}_{\text{block}}$$

变量排列：$[C_{0,0}, C_{0,1}, \ldots, C_{0,N_s-1}, C_{1,0}, \ldots]$

索引映射：$\text{idx}(z, s) = z \cdot N_s + s$

### 7.3 串联复合超级过滤器（SuperFilter）

> 源码：`engine/src/core/SuperFilter.h`

**级联效率**：

$$\eta_{\text{super}} = 1 - \prod_{k=1}^{n_{\text{stages}}} (1 - \eta_k)$$

**载灰量动态衰减**：

对每级子过滤器 $k$：

$$\eta_k(t) = \eta_{k,0} \cdot e^{-\text{loading}_k / \text{capacity}_k}$$

**载灰量累积**：

$$\text{loading}_k^{t+\Delta t} = \text{loading}_k^t + \eta_k \cdot \dot{m}_{\text{contam}} \cdot \Delta t$$

---

## 8. 人员暴露评估

> 源码：`engine/src/core/TransientSimulation.h/cpp`

### 8.1 累积吸入剂量

$$\text{Dose}_{k,\alpha} = \sum_{t=0}^{t_{\text{end}}} C_{\text{zone}(k,t)}^{t,\alpha} \cdot \dot{V}_{\text{breath}} \cdot \Delta t$$

- $k$：人员编号
- $\dot{V}_{\text{breath}}$：呼吸率（m³/s）
- $\text{zone}(k, t)$：人员 $k$ 在时刻 $t$ 所处区域（由移动时间表确定）

### 8.2 峰值浓度

$$C_{\text{peak},k,\alpha} = \max_t \left( C_{\text{zone}(k,t)}^{t,\alpha} \right)$$

### 8.3 移动污染源

人员本身作为移动 $CO_2$ 源：

$$G_{\text{occupant}}(t) = \dot{V}_{\text{breath}} \cdot C_{\text{exhaled}} \cdot \rho_{\text{zone}}$$

注入人员当前所在区域。

---

## 9. 主程序循环结构

> 源码：`engine/src/core/TransientSimulation.cpp`

```
初始化 (读取拓扑, P=0, C=0)
t = 0

While (t < EndTime):
    // 1. 控制系统更新
    updateSensors()            → 读取区域浓度/压力
    updateControllers(dt)      → 增量式PI计算
    applyActuators()           → 修改风阀开度

    // 2. 气流求解 (非线性 N-R)
    While (!AirflowConverged):
        updateDensities()
        computeFlows()          → 8种元件 ṁ(ΔP) + d
        assembleSystem(J, R)    → 雅可比矩阵装配
        solve(J·dP = -R)        → SparseLU / BiCGSTAB
        applyUpdate(SUR/TR)
        checkConvergence(‖R‖∞ < 1e-5)

    // 3. 非痕量密度耦合 (如有)
    If (hasNonTrace):
        updateDensitiesFromConcentrations()
        重新气流求解至联合收敛

    // 4. 污染源/汇装配
    updateSchedules(t)
    assembleSourcesSinks(A, b)   → 含化学动力学矩阵

    // 5. 求解瞬态污染物传输
    [A]·C^{t+Δt} = [b]          → 隐式欧拉

    // 6. 人员暴露
    updateOccupantExposure()

    // 7. 时间推进
    t = t + Δt
    输出结果
```

---

## 附录 A：物理常量

| 常量 | 符号 | 值 | 单位 |
|------|------|------|------|
| 重力加速度 | $g$ | 9.80665 | m/s² |
| 标准大气压 | $P_{\text{abs}}$ | 101325 | Pa |
| 空气气体常数 | $R_{\text{air}}$ | 287.055 | J/(kg·K) |
| 空气动力粘度 | $\mu$ | $1.81 \times 10^{-5}$ | Pa·s |
| 零压差阈值 | $\Delta P_{\min}$ | 0.001 | Pa |
| 通用气体常数 | $R_u$ | 8314.46 | J/(kmol·K) |

## 附录 B：源码文件与公式对应表

| 公式模块 | 源文件 |
|----------|--------|
| 气流求解器 | `core/Solver.cpp` |
| 压差计算 | `core/Solver.cpp::computeDeltaP()` |
| 雅可比装配 | `core/Solver.cpp::assembleSystem()` |
| RCM 重排序 | `core/Solver.cpp::computeRCMOrdering()` |
| 幂律孔口 | `elements/PowerLawOrifice.cpp` |
| Brown-Solvason 双向流 | `elements/TwoWayFlow.cpp` |
| 风扇 | `elements/Fan.cpp` |
| 风管 Darcy-Weisbach | `elements/Duct.cpp` |
| 风阀 | `elements/Damper.cpp` |
| 过滤器 | `elements/Filter.cpp` |
| 自调节通风口 | `elements/SelfRegulatingVent.cpp` |
| 单向阀 | `elements/CheckValve.cpp` |
| 污染物求解器 | `core/ContaminantSolver.cpp` |
| 耦合多物种求解 | `core/ContaminantSolver.cpp::solveCoupled()` |
| 增量式PI控制器 | `control/Controller.h` |
| Axley BLD | `core/AxleyBLD.h` |
| 气溶胶沉积 | `core/AerosolDeposition.h` |
| 化学动力学 | `core/ChemicalKinetics.h` |
| 超级过滤器 | `core/SuperFilter.h` |
| 人员暴露 | `core/TransientSimulation.cpp` |
