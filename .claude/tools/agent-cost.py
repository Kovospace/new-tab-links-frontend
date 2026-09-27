#!/usr/bin/env python3
"""What an agent run cost, and where the tokens went.

Reads the subagent transcripts Claude Code keeps under
~/.claude/projects/<project>/<session>/subagents/agent-*.jsonl and prints one block per run.

Usage:
    .claude/tools/agent-cost.py                      # every run of the last 14 days, all projects
    .claude/tools/agent-cost.py --days 3 --type backend-developer
    .claude/tools/agent-cost.py --detail path/to/agent-xyz.jsonl

The numbers, and the hole each one points at:

    first context    tokens in context on the first call: system prompt, tools, agent file,
                     the calling repo's CLAUDE.md and the brief. Fixed overhead per spawn.
    onboarded at     context when the run first reads a source file. Everything before that
                     is instructions and orientation; if it is high, required reading is too
                     broad or the code map did not point the way.
    peak context     the largest context reached.
    processed        the sum of context over every call. Every step re-sends everything read so
                     far, so this - not the peak - is what the run cost. Mostly cache reads.
    instructions     tokens of CLAUDE.md, agent files and skills read. Compare with the job:
                     a question should not read the whole standards skill.
    exploration      find / ls / tree / recursive listings. Each one is a gap in the code map.
    failed lookups   reads and commands that found nothing. Stale paths in the documentation.
    re-reads         the same file read twice. The context got too big to work from.
    multi-file cats  one command dumping several files. The costliest reading habit.

Token counts for tool results are estimated at four characters per token; the context numbers
come from the API's own usage fields and are exact.
"""

import argparse
import collections
import glob
import json
import os
import re
import sys
import time

TRANSCRIPTS = os.path.expanduser('~/.claude/projects/*/*/subagents/agent-*.jsonl')
SOURCE_PATH = re.compile(r'/(src|sql|test|public)/|\.(java|ts|sql|scss|html)\b')
INSTRUCTION_PATH = re.compile(r'CLAUDE\.md|CODEMAP\.md|/\.claude/(agents|skills)/|SKILL\.md')
EXPLORATION = re.compile(r'(^|[;&|]\s*|\bcd [^;&|]+[;&]+\s*)(find|ls|tree)\b|\bgrep -r[^|]*-l\b')
FAILURE = re.compile(r'No such file or directory|does not exist|cannot access|File not found')
READ_TARGET = re.compile(r'\b(?:cat(?: -n)?|sed -n \S+|head|tail)(?: -n ?\d+)? +([~/$\w.\-{}]+\.\w+)')


def estimate_tokens(characters):
    return characters // 4


def optional(count):
    return '-' if count is None else f'{count:,}'


def result_text(content):
    if isinstance(content, str):
        return content
    return json.dumps(content)


def read_targets(tool_name, tool_input):
    """The files a tool call reads, as far as they can be told from its input."""
    if tool_name == 'Read':
        return [tool_input.get('file_path', '')]
    if tool_name == 'Bash':
        return READ_TARGET.findall(tool_input.get('command', ''))
    return []


def analyse(path):
    run = {
        'path': path, 'type': '?', 'contexts': [], 'output': 0, 'first_source_context': None,
        'first_edit_context': None, 'instructions': 0, 'exploration': 0, 'failures': [],
        'reads': collections.Counter(), 'multi_file_cats': 0, 'results': [], 'started': None,
    }
    try:
        with open(path.replace('.jsonl', '.meta.json')) as meta:
            run['type'] = json.load(meta).get('agentType', '?')
    except (OSError, ValueError):
        pass
    seen_messages, calls = set(), {}
    with open(path) as transcript:
        for line in transcript:
            entry = json.loads(line)
            run['started'] = run['started'] or entry.get('timestamp')
            message = entry.get('message') or {}
            content = message.get('content') if isinstance(message, dict) else None
            if entry.get('type') == 'assistant':
                usage = message.get('usage', {})
                if message.get('id') not in seen_messages:
                    seen_messages.add(message.get('id'))
                    run['contexts'].append(usage.get('input_tokens', 0)
                                           + usage.get('cache_read_input_tokens', 0)
                                           + usage.get('cache_creation_input_tokens', 0))
                    run['output'] += usage.get('output_tokens', 0)
            if not isinstance(content, list):
                continue
            for block in content:
                if not isinstance(block, dict):
                    continue
                if block.get('type') == 'tool_use':
                    record_call(run, block, calls)
                elif block.get('type') == 'tool_result':
                    record_result(run, block, calls)
    return run


def record_call(run, block, calls):
    name, tool_input = block.get('name'), block.get('input') or {}
    command = tool_input.get('command', '')
    targets = read_targets(name, tool_input)
    calls[block.get('id')] = (name, command or tool_input.get('file_path', ''), targets)
    context_now = run['contexts'][-1] if run['contexts'] else 0
    for target in targets:
        run['reads'][os.path.normpath(target)] += 1
    if name in ('Edit', 'Write') and run['first_edit_context'] is None:
        run['first_edit_context'] = context_now
    if any(SOURCE_PATH.search(t) for t in targets) and run['first_source_context'] is None:
        run['first_source_context'] = context_now
    if name == 'Bash' and EXPLORATION.search(command):
        run['exploration'] += 1
    if name == 'Bash' and len(re.findall(r'\bcat\b', command)) + len(targets) > 2:
        run['multi_file_cats'] += 1


def record_result(run, block, calls):
    name, label, targets = calls.get(block.get('tool_use_id'), ('?', '', []))
    text = result_text(block.get('content'))
    run['results'].append((len(text), name, label))
    if any(INSTRUCTION_PATH.search(t) for t in targets):
        run['instructions'] += len(text)
    if block.get('is_error') or (len(text) < 600 and FAILURE.search(text)):
        run['failures'].append(label[:110])


def report(run, detail):
    contexts = run['contexts'] or [0]
    re_reads = {path: count for path, count in run['reads'].items() if count > 1}
    print(f"\n## {os.path.basename(run['path'])}  {run['type']}  {(run['started'] or '')[:16]}")
    print(f"   calls {len(run['contexts'])}   first context {contexts[0]:,}   "
          f"onboarded at {optional(run['first_source_context'])}   "
          f"first edit at {optional(run['first_edit_context'])}   peak {max(contexts):,}")
    print(f"   processed {sum(contexts):,}   output {run['output']:,}   "
          f"instructions ~{estimate_tokens(run['instructions']):,}   "
          f"tool results ~{estimate_tokens(sum(r[0] for r in run['results'])):,}")
    print(f"   exploration {run['exploration']}   failed lookups {len(run['failures'])}   "
          f"re-reads {len(re_reads)}   multi-file cats {run['multi_file_cats']}")
    if not detail:
        return
    for size, name, label in sorted(run['results'], reverse=True)[:10]:
        print(f"     ~{estimate_tokens(size):>6,}  {name:5} {label[:100]!r}")
    for failure in run['failures']:
        print(f"     failed: {failure!r}")
    for path, count in sorted(re_reads.items(), key=lambda item: -item[1]):
        print(f"     read {count}x: {path}")


def main():
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('transcripts', nargs='*', help='transcript files; default: all recent')
    parser.add_argument('--days', type=float, default=14, help='age limit for the default set')
    parser.add_argument('--type', help='only this agent type, e.g. backend-developer')
    parser.add_argument('--detail', action='store_true', help='largest results, failures, re-reads')
    arguments = parser.parse_args()
    paths = arguments.transcripts or [
        path for path in glob.glob(TRANSCRIPTS)
        if time.time() - os.path.getmtime(path) < arguments.days * 86400]
    runs = [analyse(path) for path in sorted(paths, key=os.path.getmtime)]
    runs = [run for run in runs if not arguments.type or run['type'] == arguments.type]
    if not runs:
        sys.exit('no transcripts found')
    for run in runs:
        report(run, arguments.detail)


if __name__ == '__main__':
    main()
