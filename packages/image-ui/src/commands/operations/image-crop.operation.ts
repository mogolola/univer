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

import type { IDrawingSearch, IOperation, ISrcRect } from '@univerjs/core';
import { CommandType } from '@univerjs/core';


export const OpenImageCropOperation: IOperation<IDrawingSearch> = {
    id: 'sheet.operation.open-image-crop',
    type: CommandType.OPERATION,
    handler: (accessor, params) => {
        return true;
    },
};

export const CloseImageCropOperation: IOperation<IDrawingSearch> = {
    id: 'sheet.operation.close-image-crop',
    type: CommandType.OPERATION,
    handler: (accessor, params) => {
        return true;
    },
};

export interface IOpenImageCropOperationBySrcRectParams extends IDrawingSearch {
    srcRect: ISrcRect;
}

export const OpenImageCropOperationBySrcRect: IOperation<IOpenImageCropOperationBySrcRectParams> = {
    id: 'sheet.operation.open-image-crop-by-srcRect',
    type: CommandType.OPERATION,
    handler: (accessor, params) => {
        return true;
    },
};