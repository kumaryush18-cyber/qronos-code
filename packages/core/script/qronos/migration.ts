function board(name: string) {
  return /(?:^|_)qronos_board(?:_reset)?$/.test(name)
}

function continuation(name: string) {
  return /(?:^|_)qronos_continuation(?:_intent)?$/.test(name)
}

export function file(name: string, value: string) {
  return board(name) || continuation(name) ? `// qronos_change - new file\n${value}` : value
}

export function block(name: string | undefined, source: string, value: string) {
  return (name !== undefined && (board(name) || continuation(name))) ||
    /qronos_board(?:_message)?|part_session_step_finish_idx|recall_(?:part_search|message_role)_idx|qronos_continuation_intent/.test(source)
    ? `// qronos_change start\n${value}\n// qronos_change end`
    : value
}

export function line(name: string, value: string) {
  return board(name) || continuation(name) || name.endsWith("_qronos_model_usage_index")
    ? `${value} // qronos_change`
    : value
}
