/**
 * Copyright 2023-present DreamNum Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { DocumentDataModel } from '@univerjs/core';
import { ICommandService, IUniverInstanceService, UniverInstanceType } from '@univerjs/core';
import { ThreadCommentPanel } from '@univerjs/thread-comment-ui';
import { useDependency, useObservable } from '@wendellhu/redi/react-bindings';
import React, { useMemo } from 'react';
import { Observable } from 'rxjs';
import { TextSelectionManagerService } from '@univerjs/docs';
import { DEFAULT_DOC_SUBUNIT_ID } from '../../common/const';
import { StartAddCommentOperation } from '../../commands/operations/show-comment-panel.operation';
import { DocThreadCommentService } from '../../services/doc-thread-comment.service';
import type { IAddDocCommentComment } from '../../commands/commands/add-doc-comment.command';
import { AddDocCommentComment } from '../../commands/commands/add-doc-comment.command';

export const DocThreadCommentPanel = () => {
    const univerInstanceService = useDependency(IUniverInstanceService);
    const doc = univerInstanceService.getCurrentUnitForType<DocumentDataModel>(UniverInstanceType.UNIVER_DOC);
    const subUnitId$ = useMemo(() => new Observable<string>((sub) => sub.next(DEFAULT_DOC_SUBUNIT_ID)), []);
    const textSelectionManagerService = useDependency(TextSelectionManagerService);
    const textRange = useObservable(textSelectionManagerService.textSelection$)?.textRanges[0];
    const commandService = useDependency(ICommandService);
    const docCommentService = useDependency(DocThreadCommentService);
    const tempComment = useObservable(docCommentService.addingComment$);

    if (!doc) {
        return null;
    }
    const isInValidSelection = textRange && textRange.endOffset === textRange.startOffset;
    const unitId = doc.getUnitId();

    return (
        <ThreadCommentPanel
            unitId={unitId}
            subUnitId$={subUnitId$}
            type={UniverInstanceType.UNIVER_DOC}
            onAdd={() => {
                commandService.executeCommand(StartAddCommentOperation.id);
            }}
            getSubUnitName={() => ''}
            showFilter={false}
            disableAdd={isInValidSelection}
            tempComment={tempComment}
            onAddComment={(comment) => {
                // attach an comment to an custom-range
                if (!comment.parentId) {
                    const params: IAddDocCommentComment = {
                        unitId,
                        range: tempComment!,
                        comment,
                    };
                    commandService.executeCommand(AddDocCommentComment.id, params);
                    docCommentService.endAdd();
                    return false;
                }

                return true;
            }}
        />
    );
};

DocThreadCommentPanel.componentKey = 'univer.doc.thread-comment-panel';
