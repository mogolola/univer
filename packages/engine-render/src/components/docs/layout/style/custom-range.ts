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

import type { ITextStyle, Nullable } from '@univerjs/core';
import { BooleanNumber, BorderStyleTypes, CustomRangeType } from '@univerjs/core';

export function getCustomRangeStyle(rangeType: CustomRangeType): Nullable<ITextStyle> {
    if (rangeType === CustomRangeType.COMMENT) {
        return {
            bd: {
                b: {
                    s: BorderStyleTypes.MEDIUM,
                    cl: {
                        rgb: '#fcdf7e',
                    },
                },
            },
            // ul: {
            //     s: BooleanNumber.TRUE,
            // },
        };
    }

    return null;
}
