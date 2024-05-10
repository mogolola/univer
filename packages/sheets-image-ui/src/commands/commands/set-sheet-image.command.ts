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

import type { ICommand } from '@univerjs/core';
import {
    CommandType,
    ICommandService,
    IUndoRedoService,
} from '@univerjs/core';

import { SetDrawingMutation } from '@univerjs/sheets';
import type { IAccessor } from '@wendellhu/redi';
import { SetImageMutation } from '@univerjs/drawing';
import { ClearSheetDrawingTransformerOperation } from '../operations/clear-drawing-transformer.operation';
import type { ISetDrawingCommandParams } from './interfaces';


/**
 * The command to update defined name
 */
export const SetSheetImageCommand: ICommand = {
    id: 'sheet.command.set-sheet-image',
    type: CommandType.COMMAND,
    handler: (accessor: IAccessor, params?: ISetDrawingCommandParams) => {
        const commandService = accessor.get(ICommandService);
        const undoRedoService = accessor.get(IUndoRedoService);

        if (!params) return false;

        const { unitId, drawings } = params;

        const newSheetDrawingParams = drawings.map((param) => param.newDrawing.sheetDrawingParam);
        const newImageDrawingParams = drawings.map((param) => param.newDrawing.drawingParam);

        const oldSheetDrawingParams = drawings.map((param) => param.oldDrawing.sheetDrawingParam);
        const oldImageDrawingParams = drawings.map((param) => param.oldDrawing.drawingParam);

        // execute do mutations and add undo mutations to undo stack if completed
        const result2 = commandService.syncExecuteCommand(SetImageMutation.id, newImageDrawingParams);
        const result1 = commandService.syncExecuteCommand(SetDrawingMutation.id, newSheetDrawingParams);


        if (result1 && result2) {
            undoRedoService.pushUndoRedo({
                unitID: unitId,
                undoMutations: [
                    { id: SetImageMutation.id, params: oldImageDrawingParams },
                    { id: SetDrawingMutation.id, params: oldSheetDrawingParams },
                    { id: ClearSheetDrawingTransformerOperation.id, params: [unitId] },
                ],
                redoMutations: [
                    { id: SetImageMutation.id, params: newImageDrawingParams },
                    { id: SetDrawingMutation.id, params: newSheetDrawingParams },
                    { id: ClearSheetDrawingTransformerOperation.id, params: [unitId] },
                ],
            });

            return true;
        }

        return false;
    },
};