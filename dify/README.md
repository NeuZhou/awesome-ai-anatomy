# Dify: 30+ Vector Databases, a Plugin Daemon That Runs Separately, and 1.2 Million Lines of "Make AI Easy"

## TL;DR

- **What it is** — The most popular open-source platform for building AI apps visually: drag-and-drop workflows, built-in RAG, plugin marketplace, multi-tenant everything
- **Why it matters** — Its graph engine (`graphon`) was extracted into a standalone PyPI package, the plugin daemon runs as a separate process for safety, and the RAG pipeline supports more vector databases than I could count without scrolling
- **What you'll learn** — How to build a layer-based workflow engine, why child engine spawning beats loop hacking, and what "platform complexity" actually looks like in docker-compose form

## Why Should You Care?

I opened Dify's `docker-compose.yaml` and started counting environment variables. I stopped at 400.

That's not a typo. Four hundred config knobs for a project that markets itself as making AI "easy." And honestly? For the target audience (enterprise teams that need multi-tenant AI app infrastructure), those 400 variables *do* make things easier than building it yourself. For everyone else... it's a lot.

But here's what actually surprised me — Dify recently extracted its core graph execution engine into a standalone PyPI package called `graphon`. That's the DAG runner, the thing that takes your visual workflow and executes it node by node. Which means the most interesting part of Dify is now technically portable. You could use the engine without the platform. (I haven't actually tried this in a real project, so take that with a grain of salt — but the dependency is clean in `pyproject.toml`.)

The other thing that stood out: when a workflow hits a loop or iteration node, Dify doesn't hack a counter into the existing engine. It spawns a fresh `GraphEngine` with its own `VariablePool`. Each iteration gets isolated state. Clean, a bit expensive, and exactly the kind of decision that matters in production loops.

## At a Glance

| Metric | Value |
|--------|-------|
| Stars | 136,306 |
| Forks | 21,259 |
| Language | Python (backend) + TypeScript (frontend) |
| Framework | Flask/Gunicorn + Celery + Next.js + ReactFlow |
| Lines of Code | ~1,283,000 (513K Python + 770K TypeScript) |
| License | Modified Apache 2.0 (commercial use >1M users requires license) |
| First Commit | April 2023 |
| Latest Release | v1.13.3 (March 27, 2026) |
| Data as of | April 2026 |

Dify is a platform for building AI applications through a visual drag-and-drop interface. Open a browser, connect nodes into workflows, hook up a knowledge base (RAG), pick a model provider, hit publish. Ships as 7+ Docker containers. Supports everything from chatbots to multi-step agent workflows with human-in-the-loop approval gates. "Zapier for LLM apps" is the elevator pitch — but with its own RAG engine, code sandbox, and plugin marketplace.

> **Paper context:** Dify's RAG pipeline implements ideas from the foundational RAG paper — *"Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks"* (Lewis et al., 2020, arXiv:2005.11401) — but extends it significantly with hybrid search, LLM-powered metadata filtering, and CJK-specific keyword handling via Jieba. The workflow engine's DAG execution model fits the broader agent-as-workflow trend, where a Planning module decomposes tasks into executable graphs. Dify just makes that graph visible and editable by non-engineers.

---

## Characteristics

| Dimension | Description |
|-----------|-------------|
| Architecture | graphon DAG engine extracted to standalone PyPI package, 7+ Docker containers, plugin daemon as separate process |
| Code Organization | 1.28M LOC (513K Python + 770K TypeScript), Flask/Gunicorn + Celery + Next.js + ReactFlow, 1600-line docker-compose |
| Security Approach | SSRF proxy (Squid) for HTTP node isolation, Go-based code sandbox for user-submitted code execution |
| Context Strategy | no built-in context management; child engine spawning gives each loop iteration fresh VariablePool and runtime state |
| Documentation | end-user docs thorough, 30+ vector DB integrations individually documented, 400+ env vars in docker-compose |

## Architecture

![Architecture](architecture.png)

![Architecture Detail](dify-1.png)

The first thing that hits you is the container count. Dify's `docker-compose.yaml` is 1,600 lines. Core deployment: 7 containers — API server, Celery worker, Celery beat, Next.js frontend, Redis, PostgreSQL, Nginx. Then add a Go-based code sandbox, a plugin daemon (separate process), and an SSRF proxy (Squid). On top of that, pick a vector database — and the list is kind of absurd: Weaviate, Qdrant, pgvector, Milvus, Chroma, Elasticsearch, OpenSearch, OceanBase, TiDB, Oracle, and about 15 more.

This is not a `pip install` project. This expects a DevOps team, or at least someone comfortable with Docker Compose and a lot of YAML.

The tradeoff is real though. You get production-grade multi-tenant infrastructure out of the box. Auth, workspace isolation, model key management, usage tracking — all handled. The complexity isn't accidental; it's what "platform" means.

The `graphon` extraction is the architecturally interesting bit. The Dify-specific code in `core/workflow/` is mostly wiring — connecting `graphon` nodes to Dify's model system, plugin system, and persistence layer. The core execution engine is testable and portable (in theory). Good separation.

**Key files:**
- `api/core/workflow/workflow_entry.py` — main entry point for workflow execution
- `api/core/workflow/node_factory.py` — factory that wires `graphon` nodes to Dify's LLM/tool/plugin systems
- `api/core/rag/retrieval/dataset_retrieval.py` — the 1,800-line retrieval orchestrator
- `api/core/plugin/impl/plugin.py` — plugin installer communicating with the plugin daemon
- `docker/docker-compose.yaml` — the 1,600-line deployment manifest

---

## Core Innovation

Dify's main contribution is making the entire AI application lifecycle visual and multi-tenant. Most agent frameworks give you Python and a CLI. Dify gives you a browser canvas where product managers can build workflows, and an admin panel where ops can manage API keys, monitor tokens, and publish apps — all behind auth and tenant isolation.

The graph engine is the technical crown jewel. `graphon` supports layers — middleware that wraps node execution:

```python
# From api/core/workflow/workflow_entry.py
self.graph_engine = GraphEngine(
 workflow_id=workflow_id,
 graph=graph,
 graph_runtime_state=graph_runtime_state,
 command_channel=command_channel,
 config=GraphEngineConfig(
 min_workers=dify_config.GRAPH_ENGINE_MIN_WORKERS,
 max_workers=dify_config.GRAPH_ENGINE_MAX_WORKERS,
 scale_up_threshold=dify_config.GRAPH_ENGINE_SCALE_UP_THRESHOLD,
 scale_down_idle_time=dify_config.GRAPH_ENGINE_SCALE_DOWN_IDLE_TIME,
 ),
 child_engine_builder=self._child_engine_builder,
)

# Layers stack like middleware
limits_layer = ExecutionLimitsLayer(
 max_steps=dify_config.WORKFLOW_MAX_EXECUTION_STEPS,
 max_time=dify_config.WORKFLOW_MAX_EXECUTION_TIME
)
self.graph_engine.layer(limits_layer)
self.graph_engine.layer(LLMQuotaLayer())
```

Layers handle execution limits (500 steps max, 1200 seconds by default), LLM quota tracking, and observability (OpenTelemetry spans). Child workflows spawn their own engine instances — that's how iteration and loop nodes work. They recurse into sub-graphs with `WORKFLOW_CALL_MAX_DEPTH=5`.

The node factory is where things get... busy. `DifyNodeFactory.create_node()` is 150 lines with a dictionary mapping each node type to its initialization kwargs. LLM nodes need credentials, memory, prompt serializers. Tool nodes need runtime contexts. Agent nodes need strategy resolvers. The kind of code that started as a switch statement and grew arms and legs.

```python
# From api/core/workflow/node_factory.py
node_init_kwargs_factories: Mapping[NodeType, Callable[[], dict[str, object]]] = {
 BuiltinNodeTypes.CODE: lambda: {
 "code_executor": self._code_executor,
 "code_limits": self._code_limits,
 },
 BuiltinNodeTypes.LLM: lambda: self._build_llm_compatible_node_init_kwargs(
 node_class=node_class,
 node_data=node_data,
 wrap_model_instance=True,
 include_http_client=True,
 include_llm_file_saver=True,
 # ... 4 more boolean flags
 ),
 BuiltinNodeTypes.AGENT: lambda: {
 "strategy_resolver": self._agent_strategy_resolver,
 "presentation_provider": self._agent_strategy_presentation_provider,
 "runtime_support": self._agent_runtime_support,
 "message_transformer": self._agent_message_transformer,
 },
 # ... 8 more node types
}
```

---

## How It Actually Works

### Workflow Engine

![Workflow Engine](dify-2.png)

ReactFlow on the frontend, `graphon` on the backend. Users drag nodes onto a canvas, connect them with edges, and the frontend sends JSON graph structure to the API.

The node types tell you what Dify thinks a "workflow" is:

| Node Type | What It Does |
|-----------|-------------|
| `start` | Entry point, user-defined input variables |
| `llm` | Call any LLM with templated prompts |
| `knowledge_retrieval` | RAG query against knowledge bases |
| `code` | Execute Python/JS in sandboxed container |
| `tool` | Call built-in or plugin-provided tools |
| `if_else` | Conditional branching |
| `iteration` | Loop over arrays (spawns child graph engine) |
| `loop` | While-loop with max 100 iterations |
| `parameter_extractor` | LLM-based structured output |
| `question_classifier` | LLM-based intent routing |
| `human_input` | Pause and wait for human approval |
| `http_request` | HTTP calls (routed through SSRF proxy) |
| `template_transform` | Jinja2 templating |
| `agent` | Full agent loop with tool use |
| `answer` | Output node |

The iteration node deserves a closer look. It doesn't just loop inside the existing engine — it builds a child `GraphEngine` with its own `VariablePool` and runtime state. Each iteration gets fresh variable scopes. The cost: iterate over 50 items and you spawn 50 mini-engines. Hence `MAX_ITERATIONS_NUM=99` and `LOOP_NODE_MAX_COUNT=100`.

This child engine approach is the right way to handle iteration — isolated planning contexts that don't pollute the parent's state. Each iteration gets its own variable scope, its own runtime, its own failure boundary.

### RAG Pipeline

![RAG Pipeline](dify-3.png)

Dify's RAG pipeline covers more ground than probably any open-source competitor. Full lifecycle: document ingestion through retrieval.

`DatasetRetrieval` in `dataset_retrieval.py` runs about 1,800 lines. Handles single-dataset retrieval (LLM router picks which dataset), multi-dataset retrieval (parallel queries, result merging), and a bunch of post-processing.

Four retrieval methods:
- **Semantic search** — vector similarity
- **Full-text search** — vector DB's built-in FTS or Jieba keyword index for CJK
- **Hybrid search** — semantic + full-text, merged results
- **Keyword search** — Jieba keyword table, built for Chinese text

Post-processing includes reranking (separate reranking model) and metadata filtering. The filter is LLM-powered — it generates filter conditions from the user query by prompting with dataset metadata schemas. Neat trick: users don't write filter syntax, the LLM figures it out. (Whether this is robust enough for production queries with complex filter logic... I'd want to test more, but for simple cases it's elegant.)

The Jieba keyword support for CJK is worth calling out. Most RAG frameworks are built for English and handle Chinese as an afterthought. Dify's Chinese text support isn't a plugin — it's in the core retrieval path.

The vector DB support list is... something. The docker-compose has config blocks for Weaviate, Qdrant, pgvector, Milvus, Chroma, Elasticsearch, OpenSearch, OceanBase, TiDB, Oracle, Couchbase, Hologres, AnalyticDB, Lindorm, Baidu VectorDB, Viking DB, Tencent VectorDB, Upstash, TableStore, ClickZetta, InterSystems IRIS, MatrixOne, and more. The abstraction layer in `core/rag/datasource/` unifies them, and it works. But maintaining 30+ adapters is serious engineering overhead. Prioritizing top 10 and marking the rest community-maintained would probably be a healthier split.

### Plugin System

Dify's plugin architecture is unusual: plugins run in a **separate daemon process** (`dify-plugin-daemon`), not in the main API. Communication via HTTP. Plugins can provide model providers, tools, agent strategies, and data sources.

The daemon handles:
- Installation/uninstallation (marketplace or local upload)
- Runtime isolation (separate processes, configurable timeouts)
- Storage (local filesystem, S3, Azure Blob, various cloud)
- Signature verification (enforced for official plugins)

```python
# From api/core/plugin/impl/plugin.py
class PluginInstaller(BasePluginClient):
 def fetch_plugin_readme(self, tenant_id: str, plugin_unique_identifier: str, language: str) -> str:
 response = self._request_with_plugin_daemon_response(
 "GET",
 f"plugin/{tenant_id}/management/fetch/readme",
 PluginReadmeResponse,
 params={
 "tenant_id": tenant_id,
 "plugin_unique_identifier": plugin_unique_identifier,
 "language": language,
 },
 )
 return response.content
```

Every plugin call goes through the daemon. Adds latency (HTTP round-trip per call) but gives process isolation — a bad plugin can't crash the main API. The tradeoff vs in-process plugins (DeerFlow's middleware, OpenClaw's skills) is safety for speed and deployment complexity. One more service to monitor, one more log stream, one more container. The safety benefits are clear for multi-tenant scenarios where you don't trust third-party plugin code.

---

## The Verdict

You know the feature list — it's long. The real question: does the breadth justify the deployment complexity?

For teams with DevOps capacity and non-technical stakeholders who need to build AI workflows, yeah. Dify is probably the best option in this space. The visual workflow editor + multi-tenant isolation + built-in RAG is a combination nobody else offers at this scale.

The `graphon` extraction is a solid architectural move. Decouples execution from the app layer, makes the engine testable. The layer system (limits, quotas, observability) is well-designed and extendable.

But the complexity cost is real. Minimum 7 containers. Add vector DB: 8-9. Add plugin daemon and sandbox: small Kubernetes cluster territory. 400+ environment variables. The node factory has a type-specific init dictionary with 10+ entries, each wiring together credentials providers, file managers, HTTP clients, and template renderers. For self-hosters, you inherit the infrastructure complexity. The platform makes it easy for end users; someone still has to run the platform.

The modified Apache 2.0 license (commercial license required for >1M users) means this isn't truly "open" the way MIT/Apache projects are. Source-available with a commercial ceiling. Fine for most users, worth knowing about.

Would I use it? For an enterprise team that needs a managed AI platform and has the DevOps bandwidth — yes. For an individual dev building a single agent? Probably not. The overhead doesn't pay off until you need multi-tenant isolation, visual workflows for non-engineers, or the plugin marketplace. There's a reason nobody uses Kubernetes for their side project.

---

## Cross-Project Comparison

| Feature | Dify | DeerFlow | Hermes Agent |
|---------|------|----------|-------------|
| Architecture | Platform (7+ containers) | Monolith (2 services) | Single process |
| Primary Interface | Browser GUI | Browser GUI + CLI | CLI only |
| Workflow Engine | graphon (DAG with layers) | LangGraph (middleware chain) | Plain function calls |
| RAG | Built-in, 30+ vector DBs | None built-in | FTS5 session search |
| Plugin System | Daemon-based (process isolation) | MCP servers | Skills (file-based) |
| Multi-tenant | Yes (workspace/team model) | No | No |
| Code Execution | Sandboxed container (Go) | Sandboxed container | Direct execution |
| Model Support | Any (via plugin marketplace) | Fixed set | Fixed set |
| Deployment Complexity | High (7+ containers, 400+ env vars) | Medium (2 containers) | Low (pip install) |
| License | Modified Apache 2.0 | MIT | MIT |
| Target User | Teams / Enterprise | Developers | Individual developers |
| Lines of Code | ~1,283,000 | ~260,000 (estimated) | ~260,000 |

Dify and DeerFlow both have visual workflow editors, but different problems. DeerFlow is a dev tool — middleware chain and LangGraph give fine-grained control, assumes you write code. Dify is a platform — assumes non-technical users build workflows and technical users manage infra.

Hermes is the polar opposite. Where Dify adds services, Hermes removes them. Where Dify builds a GUI, Hermes stays in the terminal. Same problem (AI apps), opposite ends of the complexity spectrum.

Platform wins when: multiple teams, compliance requirements, non-technical stakeholders. CLI wins when: one developer, ship fast, no infra to manage.

---

## Stuff Worth Stealing

### 1. Layer-Based Graph Engine Middleware

The `graphon` layer system for extending workflow execution without touching the engine:

```python
# From api/core/workflow/workflow_entry.py
limits_layer = ExecutionLimitsLayer(
 max_steps=dify_config.WORKFLOW_MAX_EXECUTION_STEPS,
 max_time=dify_config.WORKFLOW_MAX_EXECUTION_TIME
)
self.graph_engine.layer(limits_layer)
self.graph_engine.layer(LLMQuotaLayer())

# Observability only when needed
if dify_config.ENABLE_OTEL or is_instrument_flag_enabled():
 self.graph_engine.layer(ObservabilityLayer())
```

Layers observe events rather than modify the message pipeline. Less fragile ordering than middleware chains.

### 2. LLM-Powered Metadata Filtering

Instead of filter syntax, prompt an LLM with dataset metadata schemas + user query, get back structured filter conditions, apply before vector search. "Find documents from Q1 2025 about embeddings" → system figures out the date range and topic filter. Simple for users, surprisingly effective for straightforward queries.

### 3. Child Engine Spawning for Iteration

When a loop/iteration node fires, spawn a fresh `GraphEngine` with its own `VariablePool`:

```python
# From api/core/workflow/workflow_entry.py
class _WorkflowChildEngineBuilder:
 def build_child_engine(self, *, workflow_id, graph_init_params,
 parent_graph_runtime_state, root_node_id,
 variable_pool=None) -> GraphEngine:
 child_graph_runtime_state = GraphRuntimeState(
 variable_pool=variable_pool if variable_pool is not None
 else parent_graph_runtime_state.variable_pool,
 start_at=time.perf_counter(),
 execution_context=parent_graph_runtime_state.execution_context,
 )
 child_engine = GraphEngine(
 workflow_id=workflow_id, graph=child_graph,
 graph_runtime_state=child_graph_runtime_state,
 command_channel=command_channel, config=config,
 child_engine_builder=self,
 )
 child_engine.layer(LLMQuotaLayer())
 return child_engine
```

Isolated state, shared resource tracking. Clean recursion.

### 4. Process-Isolated Plugin Daemon

Don't load plugins in-process. Run a separate daemon, communicate via gRPC. Plugins crash without taking down your API. Worth the deployment complexity if you accept third-party extensions.

---

## Hooks & Easter Eggs

- The code sandbox default node dimensions in test graph creation are `114 × 514`. If you know, you know. (From `workflow_entry.py:_create_single_node_graph`)
- `WORKFLOW_CALL_MAX_DEPTH=5` — workflows calling sub-workflows, 5 levels deep. The recursion guard exists because users *absolutely will* build infinite loops if you let them.
- The SSRF proxy isn't window dressing — every HTTP request node and plugin HTTP call routes through Squid. One of the few AI platforms that treats SSRF as an infrastructure problem, not a regex problem.
- Dify supports both PostgreSQL *and* MySQL as primary database. Unusual for a project this size. Migration system handles both dialects.
- Plugin daemon has signature verification for official (langgenius) plugins, but third-party plugins can skip it. `FORCE_VERIFYING_SIGNATURE` flag. Worth checking what your policy is.

---

## Verification Log

<details>
<summary>Fact-check log (click to expand)</summary>

| Claim | Verification Method | Result |
|-------|-------------------|--------|
| 136,306 stars | GitHub API (`stargazers_count`) | Verified |
| 21,259 forks | GitHub API (`forks_count`) | Verified |
| ~1,283,000 LOC (513K Python + 770K TS) | PowerShell `Get-Content \| Measure-Object -Line` | Verified |
| First commit April 2023 | GitHub API (`created_at: 2023-04-12`) | Verified |
| Latest release v1.13.3 | GitHub API releases/latest (`tag_name: 1.13.3`) | Verified |
| Modified Apache 2.0 license | `LICENSE` file content | Verified |
| `graphon>=0.1.2` dependency | `api/pyproject.toml:31` | Verified |
| `workflow_entry.py` exists | File read via `read` tool | Verified |
| `node_factory.py` exists | File read via `read` tool | Verified |
| `dataset_retrieval.py` ~1,800 lines | File has `[1774 more lines]` at offset 101 → ~1,875 total | Verified |
| 7+ containers in docker-compose | Container definitions: api, worker, worker_beat, web, db, redis, nginx, sandbox, plugin_daemon, ssrf_proxy | Verified |
| 30+ vector DB support | docker-compose env vars list Weaviate, Qdrant, pgvector, Milvus, Chroma, ES, OpenSearch, OceanBase, TiDB, Oracle, etc. | Verified |
| `WORKFLOW_MAX_EXECUTION_STEPS=500` | docker-compose env var | Verified |
| `WORKFLOW_MAX_EXECUTION_TIME=1200` | docker-compose env var | Verified |
| `WORKFLOW_CALL_MAX_DEPTH=5` | docker-compose env var | Verified |
| Node dimensions `114 x 514` | `workflow_entry.py:_create_single_node_graph` default params | Verified |
| Plugin daemon runs as separate container | docker-compose `plugin_daemon` service with image `langgenius/dify-plugin-daemon:0.5.3-local` | Verified |

</details>

---

*Part of [awesome-ai-anatomy](https://github.com/NeuZhou/awesome-ai-anatomy) — source-level teardowns of how production AI systems actually work.*
