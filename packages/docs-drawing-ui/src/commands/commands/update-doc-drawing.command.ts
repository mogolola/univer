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

import type { ICommand, IMutationInfo, JSONXActions } from '@univerjs/core';
import {
    BooleanNumber,
    CommandType,
    ICommandService,
    IUniverInstanceService,
    JSONX,
    ObjectRelativeFromH,
    ObjectRelativeFromV,
    PositionedObjectLayoutType,
} from '@univerjs/core';
import type { IAccessor } from '@wendellhu/redi';
import type { IRichTextEditingMutationParams } from '@univerjs/docs';
import { DocSkeletonManagerService, RichTextEditingMutation } from '@univerjs/docs';
import type { IDocDrawing } from '@univerjs/docs-drawing';

export enum TextWrappingStyle {
    INLINE = 'inline',
    BEHIND_TEXT = 'behindText',
    IN_FRONT_OF_TEXT = 'inFrontOfText',
    WRAP_SQUARE = 'wrapSquare',
    WRAP_TOP_AND_BOTTOM = 'wrapTopAndBottom',
}

const WRAPPING_STYLE_TO_LAYOUT_TYPE = {
    [TextWrappingStyle.INLINE]: PositionedObjectLayoutType.INLINE,
    [TextWrappingStyle.WRAP_SQUARE]: PositionedObjectLayoutType.WRAP_SQUARE,
    [TextWrappingStyle.WRAP_TOP_AND_BOTTOM]: PositionedObjectLayoutType.WRAP_TOP_AND_BOTTOM,
    [TextWrappingStyle.IN_FRONT_OF_TEXT]: PositionedObjectLayoutType.WRAP_NONE,
    [TextWrappingStyle.BEHIND_TEXT]: PositionedObjectLayoutType.WRAP_NONE,
};

interface IUpdateDocDrawingWrappingStyleParams {
    unitId: string;
    subUnitId: string;
    drawings: IDocDrawing[];
    wrappingStyle: TextWrappingStyle;
}

/**
 * The command to update drawing wrapping style.
 */
export const UpdateDocDrawingWrappingStyleCommand: ICommand = {
    id: 'doc.command.update-doc-drawing-wrapping-style',

    type: CommandType.COMMAND,

    // eslint-disable-next-line max-lines-per-function, complexity
    handler: (accessor: IAccessor, params?: IUpdateDocDrawingWrappingStyleParams) => {
        if (params == null) {
            return false;
        }

        const commandService = accessor.get(ICommandService);
        const univerInstanceService = accessor.get(IUniverInstanceService);
        const docSkeletonManagerService = accessor.get(DocSkeletonManagerService);

        const docsSkeletonObject = docSkeletonManagerService.getCurrent();
        const documentDataModel = univerInstanceService.getCurrentUniverDocInstance();
        if (documentDataModel == null || docsSkeletonObject == null) {
            return false;
        }

        const { drawings, wrappingStyle, unitId, subUnitId } = params;

        if (docsSkeletonObject.unitId !== unitId) {
            return false;
        }

        const { skeleton } = docsSkeletonObject;
        const skeletonData = skeleton.getSkeletonData();

        if (skeletonData == null) {
            return false;
        }

        const { pages } = skeletonData;

        const jsonX = JSONX.getInstance();
        const rawActions: JSONXActions = [];

        const { drawings: oldDrawings = {} } = documentDataModel.getSnapshot();

        // Update drawing layoutType.
        for (const drawing of drawings) {
            const { drawingId } = drawing;

            const oldLayoutType = oldDrawings[drawingId].layoutType;
            const newLayoutType = WRAPPING_STYLE_TO_LAYOUT_TYPE[wrappingStyle];

            if (oldLayoutType !== newLayoutType) {
                const updateLayoutTypeAction = jsonX.replaceOp(['drawings', drawingId, 'layoutType'], oldLayoutType, newLayoutType);

                rawActions.push(updateLayoutTypeAction!);
            }

            if (wrappingStyle === TextWrappingStyle.BEHIND_TEXT || wrappingStyle === TextWrappingStyle.IN_FRONT_OF_TEXT) {
                const oldBehindDoc = oldDrawings[drawingId].behindDoc;
                const newBehindDoc = wrappingStyle === TextWrappingStyle.BEHIND_TEXT ? BooleanNumber.TRUE : BooleanNumber.FALSE;

                if (oldBehindDoc !== newBehindDoc) {
                    const updateBehindDocAction = jsonX.replaceOp(['drawings', drawingId, 'behindDoc'], oldBehindDoc, newBehindDoc);

                    rawActions.push(updateBehindDocAction!);
                }
            }

            if (wrappingStyle === TextWrappingStyle.INLINE) {
                continue;
            }

            let skeDrawing = null;
            for (const page of pages) {
                for (const [key, value] of page.skeDrawings.entries()) {
                    if (key === drawingId) {
                        skeDrawing = value;
                        break;
                    }
                }

                if (skeDrawing != null) {
                    break;
                }
            }

            if (skeDrawing != null) {
                const { aTop, aLeft } = skeDrawing;
                const oldPositionH = oldDrawings[drawingId].docTransform.positionH;
                const newPositionH = {
                    relativeFrom: ObjectRelativeFromH.PAGE,
                    posOffset: aLeft,
                };

                if (oldPositionH.relativeFrom !== newPositionH.relativeFrom || oldPositionH.posOffset !== newPositionH.posOffset) {
                    const action = jsonX.replaceOp(['drawings', drawingId, 'docTransform', 'positionH'], oldPositionH, newPositionH);

                    rawActions.push(action!);
                }

                const oldPositionV = oldDrawings[drawingId].docTransform.positionV;
                const newPositionV = {
                    relativeFrom: ObjectRelativeFromV.MARGIN,
                    posOffset: aTop,
                };

                if (oldPositionV.relativeFrom !== newPositionV.relativeFrom || oldPositionV.posOffset !== newPositionV.posOffset) {
                    const action = jsonX.replaceOp(['drawings', drawingId, 'docTransform', 'positionV'], oldPositionV, newPositionV);

                    rawActions.push(action!);
                }
            }
        }

        const doMutation: IMutationInfo<IRichTextEditingMutationParams> = {
            id: RichTextEditingMutation.id,
            params: {
                unitId,
                actions: [],
                textRanges: null,
            },
        };

        doMutation.params.actions = rawActions.reduce((acc, cur) => {
            return JSONX.compose(acc, cur as JSONXActions);
        }, null as JSONXActions);

        const result = commandService.syncExecuteCommand<
            IRichTextEditingMutationParams,
            IRichTextEditingMutationParams
        >(doMutation.id, doMutation.params);

        return Boolean(result);
    },
};
