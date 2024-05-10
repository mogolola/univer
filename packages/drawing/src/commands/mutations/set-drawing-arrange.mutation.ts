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

import type { IMutation } from '@univerjs/core';
import { CommandType, IDrawingManagerService } from '@univerjs/core';


export interface ISetImageArrangeMutationParams {
    unitId: string;
    subUnitId: string;
    drawingIds: string[];
}

export const SetDrawingArrangeMutation: IMutation<ISetImageArrangeMutationParams> = {
    id: 'sheet.mutation.set-image-arrange',
    type: CommandType.MUTATION,
    handler: (accessor, params) => {
        const drawingManagerService = accessor.get(IDrawingManagerService);

        const { unitId, subUnitId, drawingIds } = params;

        drawingManagerService.replaceDrawingOrder(unitId, subUnitId, drawingIds);

        return true;
    },
};