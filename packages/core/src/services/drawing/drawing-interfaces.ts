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

export interface ISize {
    width?: number;
    height?: number;
}

export interface IScale {
    scaleX?: number;
    scaleY?: number;
}

export interface IOffset {
    left?: number;
    top?: number;
}

export interface IOtherTransform {
    angle?: number;
    skewX?: number;
    skewY?: number;
    flipX?: boolean;
    flipY?: boolean;
}

export interface ISrcRect extends IOffset {
    right?: number;
    bottom?: number;
}

export interface IAbsoluteTransform extends ISize, IOffset, IScale {

}

export interface ITransformState extends IAbsoluteTransform, IOtherTransform {

}