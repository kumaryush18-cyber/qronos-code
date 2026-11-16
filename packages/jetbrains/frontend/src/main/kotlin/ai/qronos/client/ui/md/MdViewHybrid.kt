package ai.qronos.client.ui.md

import ai.qronos.client.session.ui.selection.SessionSelection
import ai.qronos.client.session.ui.style.SessionEditorStyle

internal class MdViewHybrid(
    style: SessionEditorStyle = SessionEditorStyle.current(),
    selection: SessionSelection? = null,
    code: MdCodeBlockFactory = MdCodeBlockFactory.default(),
) : ai.qronos.client.ui.md.hybrid.MdViewHybrid(style, selection, code)
