# 陆凡

**软件工程师 / Windows 原生开发 / 独立开发者**

📱 18627158203　|　📧 [lxyfl6688@gmail.com](mailto:lxyfl6688@gmail.com)
🔗 github.com/fanlusky　|　🌐 msime.app

## 个人简介

华中科技大学软件工程本科毕业，具有 **Java 后端、C/C++ Windows 原生开发及独立产品开发**经验。曾在华为云从事企业级 Java 后端开发，2024 年起专注于 Windows 原生软件及 AI/NLP 应用开发。

主要技术方向为 **C/C++、Windows API、TSF、Direct2D/DirectWrite、WebView2、SQLite、IPC、CMake**，同时具备 **Whisper.cpp、ONNX Runtime、KenLM** 等 AI/NLP 实践经验。独立开发并长期维护开源 Windows 中文输入法 **MetasequoiaIME**，完成从底层输入法框架、进程通信、算法与数据，到原生 UI、WebView2、AI 能力、安装发布及开源社区维护的完整产品链路。

## 工作经历

### 华为云 · 后端开发实习

**2022.06 – 2022.08**

- 使用 **Java** 参与商务测算相关后端功能开发及业务数据处理。
- 参与商务定级、利润测算、折扣测算等业务模块开发与维护，熟悉企业级 Java 项目的开发、调试及协作流程。

### 华为云 · 后端开发

**2023.06 – 2024.05**

- 使用 **Java / Spring / MyBatis** 参与企业级后端业务系统开发及维护。
- 负责商务测算相关业务逻辑、数据处理、功能开发及问题定位，参与需求开发、问题单处理及代码维护。

### 独立开发者

**2024.05 – 至今**

- 独立开发 **Windows 原生软件、中文输入法、语音输入及 AI/NLP 应用**。
- 负责项目的**架构设计、核心开发、性能优化、UI、数据处理、安装发布、官网及开源维护**。
- 长期使用 **C/C++、Windows API、CMake、SQLite、WebView2、Python** 进行 Windows 软件开发。

## 核心项目

### MetasequoiaIME · 水杉输入法

**C/C++ · Windows API · TSF · WebView2 · Direct2D · DirectWrite · SQLite · CMake · Python**

[GitHub](https://github.com/metasequoiaime/MSIME-Windows) · [Website](https://msime.app)

- **独立设计并长期维护完整的 Windows 中文输入法系统**，采用纯 **TSF** 架构，项目包含 TSF Core、独立 Server、UI、词库及辅助码等模块，GitHub **350+ Stars**。
- 基于 **Text Services Framework（TSF）** 实现 Composition、Candidate List、Preserved Key 等输入法核心能力，并针对不同 Windows 应用持续处理兼容性与稳定性问题。
- 采用 **TSF DLL + 独立 Server** 架构，通过 **Named Pipe、Shared Memory、Windows Message、Event** 等机制实现输入法核心、算法服务与 UI 之间的进程间通信。
- 使用 **Direct2D + DirectWrite** 实现候选窗口、文本排版及字体渲染；使用 **WebView2 + HTML/CSS/TypeScript** 构建设置、词库等复杂交互界面，形成原生 UI 与 Web UI 混合架构。
- 实现 **全拼、双拼、86 五笔、辅助码、调频、云候选、中英混输、简繁转换、智能标点、成对标点**等完整输入能力，并支持多种双拼及辅助码方案。
- 集成 **AI 联想、语音输入、手写识别、快捷短语、日期/时间快捷输入、Unicode 输入、表情符号、屏幕键盘**等实用功能，持续完善桌面端产品体验。
- 构建大规模中文词库及数据处理体系，使用 **Python + SQLite** 完成语料清洗、词频处理、词库维护及查询优化；持续研究 **Pinyin → Han、Viterbi、N-gram、KenLM、候选排序与调频算法**。
- 独立完成 **安装包、Release、官网、文档、Issue / PR 及社区维护**，项目已具备较完整的产品功能和实际用户基础。

### Metasequoia Voice Input · 水杉语音输入

**C/C++ · Whisper.cpp · ONNX Runtime · Silero VAD · Windows API**

- 独立开发 Windows 语音输入工具，实现 **录音 → 语音活动检测 → 语音识别 → 文本处理 → 当前应用上屏**完整链路。
- 使用 **Whisper.cpp** 实现本地语音识别，结合 **Silero VAD + ONNX Runtime** 进行语音活动检测，并支持云端 ASR 与文本润色方案。
- 结合 Windows API 实现快捷键、音频输入及多种文本上屏方式，针对实际桌面应用场景优化交互体验。

## 技术能力

**C/C++：** C++17、STL、Windows API、TSF、Direct2D、DirectWrite、WebView2、Native Window、Windows Message、IPC、Named Pipe、Shared Memory

**桌面开发：** WebView2、HTML/CSS、JavaScript/TypeScript、Vite、DPI Awareness、CMake、Visual Studio、vcpkg

**AI / NLP：** Whisper.cpp、ONNX Runtime、Silero VAD、KenLM、N-gram、Viterbi、拼音输入、候选排序

**后端 / 数据：** Java、Spring Boot、Spring、MyBatis、REST API、SQLite、MySQL、Python

**工程与开源：** Git / GitHub、Linux、CI/CD、Windows 安装包、Release 发布、开源项目维护
