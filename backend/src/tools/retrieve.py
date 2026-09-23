"""Single retrieval door for every agent and for document/video chat."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import logging

from src.tools.kb_ops import get_retriever

logger = logging.getLogger(__name__)

_AGENT = {
    "notes": "notes_agent",
    "books": "books_agent",
    "video": "video_agent",
}


@dataclass
class Chunk:
    id: str
    text: str
    content_type: str
    source_file: str
    title: str
    page: int | None = None
    start_sec: int | None = None
    end_sec: int | None = None
    course_id: int | None = None
    video_id: int | None = None
    score: float | None = None


def _docs_to_chunks(docs, content_type: str) -> list[Chunk]:
    out: list[Chunk] = []
    for i, d in enumerate(docs):
        md = d.metadata or {}
        text = (d.page_content or "").strip()
        if not text:
            continue
        out.append(
            Chunk(
                id=str(md.get("id") or f"{content_type}-{i}"),
                text=text,
                content_type=content_type,
                source_file=str(md.get("source") or md.get("material_title") or ""),
                title=str(md.get("material_title") or md.get("video_title") or md.get("source") or ""),
                page=md.get("page") or md.get("page_number"),
                start_sec=md.get("start_sec"),
                end_sec=md.get("end_sec"),
                course_id=md.get("course_id"),
                video_id=md.get("video_id"),
                score=md.get("score"),
            )
        )
    return out


def _search_faiss(index_dir: Path, query: str, k: int, embed_model: str | None = None):
    from langchain_community.vectorstores import FAISS
    from src.utils.llm import embeddings as make_embeddings

    if not (index_dir / "index.faiss").exists():
        return []
    vs = FAISS.load_local(
        str(index_dir),
        make_embeddings(),
        allow_dangerous_deserialization=True,
    )
    return vs.similarity_search(query, k=k)


def retrieve(
    query: str,
    *,
    content_types: list[str] | None = None,
    course_id: int | None = None,
    video_id: int | None = None,
    material_title: str | None = None,
    k: int = 5,
) -> list[Chunk]:
    """THE function. Agents and chat_service must use this, nothing else."""

    if video_id is not None:
        docs = _search_faiss(
            Path("knowledge_base") / "videos" / str(video_id) / "vector_store",
            f"{material_title or ''} {query}".strip(),
            k,
        )
        return _docs_to_chunks(docs, "video")

    if course_id is not None:
        docs = _search_faiss(
            Path("knowledge_base") / "courses" / str(course_id) / "vector_store",
            f"{material_title or ''} {query}".strip(),
            k,
        )
        chunks = _docs_to_chunks(docs, "course_material")
        if material_title:
            title = material_title.lower().replace(" ", "_")
            filtered = [
                c for c in chunks
                if title in (c.source_file or "").lower().replace(" ", "_")
                or title in (c.title or "").lower().replace(" ", "_")
            ]
            if filtered:
                return filtered[:k]
        return chunks[:k]

    types = content_types or ["notes", "books", "video"]
    chunks: list[Chunk] = []
    for t in types:
        agent = _AGENT.get(t)
        if not agent:
            continue
        retriever = get_retriever(agent)
        if not retriever:
            continue
        try:
            docs = retriever.invoke(query)
        except Exception as e:
            logger.warning("retrieve(%s) failed: %s", t, e)
            continue
        chunks.extend(_docs_to_chunks(docs, t))
    return chunks[:k]


def chunks_as_prompt(chunks: list[Chunk]) -> str:
    if not chunks:
        return ""
    parts = []
    for i, c in enumerate(chunks, 1):
        if c.page is not None:
            loc = f"p.{c.page}"
        elif c.start_sec is not None:
            loc = f"{c.start_sec}s–{c.end_sec or c.start_sec}s"
        else:
            loc = ""
        header = f"[{i}] {c.source_file} {loc}".strip()
        parts.append(f"{header}\n{c.text}")
    return "\n\n---\n\n".join(parts)
