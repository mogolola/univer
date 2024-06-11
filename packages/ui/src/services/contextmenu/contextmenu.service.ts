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

import { Disposable, toDisposable } from '@univerjs/core';
import type { IMouseEvent, IPointerEvent } from '@univerjs/engine-render';
import type { IDisposable } from '@wendellhu/redi';
import { createIdentifier } from '@wendellhu/redi';

export interface IContextMenuHandler {
    /** A callback to open context menu with given position and menu type. */
    handleContextMenu(event: IPointerEvent | IMouseEvent, menuType: string): void;
}

export interface IContextMenuPosition {

}

export interface IContextMenuService {
    disabled: boolean;

    enable(): void;
    disable(): void;
    triggerContextMenu(event: IPointerEvent | IMouseEvent, menuType: string): void;

    registerContextMenuHandler(handler: IContextMenuHandler): IDisposable;
}

export const IContextMenuService = createIdentifier<IContextMenuService>('ui.contextmenu.service');

export class DesktopContextMenuService extends Disposable implements IContextMenuService {
    private _currentHandler: IContextMenuHandler | null = null;

    disabled: boolean = false;

    disable(): void {
        this.disabled = true;
    }

    enable(): void {
        this.disabled = false;
    }

    triggerContextMenu(event: IPointerEvent | IMouseEvent, menuType: string): void {
        event.stopPropagation();

        if (this.disabled) return;
        this._currentHandler?.handleContextMenu(event, menuType);
    }

    registerContextMenuHandler(handler: IContextMenuHandler): IDisposable {
        if (this._currentHandler) {
            throw new Error('There is already a context menu handler!');
        }

        this._currentHandler = handler;
        return toDisposable(() => this._currentHandler = null);
    }
}
