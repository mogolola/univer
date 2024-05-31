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

import type { DocumentDataModel, ICommandInfo, IDocDrawingPosition, Nullable } from '@univerjs/core';
import { Disposable, DrawingTypeEnum, FOCUSING_COMMON_DRAWINGS, ICommandService, IContextService, IDrawingManagerService, IImageRemoteService, ImageUploadStatusType, IUniverInstanceService, LifecycleStages, LocaleService, ObjectRelativeFromH, ObjectRelativeFromV, OnLifecycle, PositionedObjectLayoutType, UniverInstanceType } from '@univerjs/core';
import { Inject } from '@wendellhu/redi';
import { getImageSize } from '@univerjs/drawing';
import { IMessageService } from '@univerjs/ui';
import { MessageType } from '@univerjs/design';
import type { IDocDrawing } from '@univerjs/docs';
import { DocSkeletonManagerService, IDocDrawingService, TextSelectionManagerService } from '@univerjs/docs';
import { docDrawingPositionToTransform, transformToDocDrawingPosition } from '@univerjs/docs-ui';
import type { Documents } from '@univerjs/engine-render';
import { IRenderManagerService, ITextSelectionRenderManager, Liquid } from '@univerjs/engine-render';
import type { IInsertImageOperationParams } from '../commands/operations/insert-image.operation';
import { InsertDocImageOperation } from '../commands/operations/insert-image.operation';
import type { IInsertDrawingCommandParams, ISetDrawingCommandParams } from '../commands/commands/interfaces';
import { type ISetDrawingArrangeCommandParams, SetDocDrawingArrangeCommand } from '../commands/commands/set-drawing-arrange.command';
import { InsertDocDrawingCommand } from '../commands/commands/insert-doc-drawing.command';
import { GroupDocDrawingCommand } from '../commands/commands/group-doc-drawing.command';
import { UngroupDocDrawingCommand } from '../commands/commands/ungroup-doc-drawing.command';
import { SetDocDrawingCommand } from '../commands/commands/set-doc-drawing.command';

const SHEET_IMAGE_WIDTH_LIMIT = 500;
const SHEET_IMAGE_HEIGHT_LIMIT = 500;

@OnLifecycle(LifecycleStages.Rendered, DocDrawingUpdateController)
export class DocDrawingUpdateController extends Disposable {
    constructor(
        @ICommandService private readonly _commandService: ICommandService,
        @IUniverInstanceService private readonly _univerInstanceService: IUniverInstanceService,
        @Inject(TextSelectionManagerService) private readonly _textSelectionManagerService: TextSelectionManagerService,
        @ITextSelectionRenderManager private readonly _textSelectionRenderManager: ITextSelectionRenderManager,
        @IImageRemoteService private readonly _imageRemoteService: IImageRemoteService,
        @IDocDrawingService private readonly _sheetDrawingService: IDocDrawingService,
        @IDrawingManagerService private readonly _drawingManagerService: IDrawingManagerService,
        @IContextService private readonly _contextService: IContextService,
        @IMessageService private readonly _messageService: IMessageService,
        @Inject(LocaleService) private readonly _localeService: LocaleService,
        @Inject(DocSkeletonManagerService) private readonly _docSkeletonManagerService: DocSkeletonManagerService,
        @IRenderManagerService private readonly _renderManagerService: IRenderManagerService
    ) {
        super();

        this._init();
    }

    private _init(): void {
        this._initCommandListeners();

        this._updateDrawingListener();

        this._updateOrderListener();

        this._groupDrawingListener();

        this._focusDrawingListener();
    }

    /**
     * Upload image to cell or float image
     */
    private _initCommandListeners() {
        this.disposeWithMe(
            this._commandService.onCommandExecuted(async (command: ICommandInfo) => {
                if (command.id === InsertDocImageOperation.id) {
                    const params = command.params as IInsertImageOperationParams;
                    if (params.files == null) {
                        return;
                    }

                    this._imageRemoteService.setWaitCount(params.files.length);

                    params.files.forEach(async (file) => {
                        await this._insertFloatImage(file);
                    });
                }
            })
        );
    }

    private async _insertFloatImage(file: File) {
        const imageParam = await this._imageRemoteService.saveImage(file);

        if (imageParam == null) {
            return;
        }

        if (imageParam.status === ImageUploadStatusType.ERROR_EXCEED_SIZE) {
            this._messageService.show({
                type: MessageType.Error,
                content: this._localeService.t('update-status.exceedMaxSize'),
            });
        } else if (imageParam.status === ImageUploadStatusType.ERROR_IMAGE_TYPE) {
            this._messageService.show({
                type: MessageType.Error,
                content: this._localeService.t('update-status.invalidImageType'),
            });
        }

        const info = this._getUnitInfo();
        if (info == null) {
            return;
        }
        const { unitId, subUnitId } = info;

        // const currentAllDrawing = this._sheetDrawingService.getDrawingMap(unitId, subUnitId);
        // let zIndex = 0;
        // if (currentAllDrawing && Object.keys(currentAllDrawing).length > 0) {
        //     const drawingIds = Object.keys(currentAllDrawing);
        //     zIndex = drawingIds.length;
        // }

        const { imageId, imageSourceType, source, base64Cache } = imageParam;

        // if (imageSourceType === ImageSourceType.UUID) {
        //     try {
        //         source = await this._imageRemoteService.getImage(imageId);
        //     } catch (error) {
        //         console.error(error);
        //     }
        // }

        const { width, height, image } = await getImageSize(base64Cache || '');

        this._imageRemoteService.addImageSourceCache(imageId, imageSourceType, image);

        let scale = 1;
        if (width > SHEET_IMAGE_WIDTH_LIMIT || height > SHEET_IMAGE_HEIGHT_LIMIT) {
            const scaleWidth = SHEET_IMAGE_WIDTH_LIMIT / width;
            const scaleHeight = SHEET_IMAGE_HEIGHT_LIMIT / height;
            scale = Math.max(scaleWidth, scaleHeight);
        }

        const docTransform = this._getImagePosition(width, height, scale);

        if (docTransform == null) {
            return;
        }

        const docDrawingParam: IDocDrawing = {
            unitId,
            subUnitId,
            drawingId: imageId,
            drawingType: DrawingTypeEnum.DRAWING_IMAGE,
            imageSourceType,
            source,
            transform: docDrawingPositionToTransform(docTransform, this._textSelectionRenderManager),
            docTransform,
            title: '', description: '', layoutType: PositionedObjectLayoutType.WRAP_SQUARE,
        };

        this._commandService.executeCommand(InsertDocDrawingCommand.id, {
            unitId,
            drawings: [docDrawingParam],
        } as IInsertDrawingCommandParams);

        this._docSkeletonManagerService.getCurrent()?.skeleton.calculate();
    }

    private _getUnitInfo() {
        const documentDataModel = this._univerInstanceService.getCurrentUnitForType<DocumentDataModel>(UniverInstanceType.UNIVER_DOC);
        if (documentDataModel == null) {
            return;
        }

        const unitId = documentDataModel.getUnitId();
        const subUnitId = unitId;

        return {
            unitId,
            subUnitId,
        };
    }

    private _getImagePosition(imageWidth: number, imageHeight: number, scale: number): Nullable<IDocDrawingPosition> {
        const activeTextRange = this._textSelectionManagerService.getActiveTextRange();
        const position = activeTextRange?.getAbsolutePosition() || {
            left: 0,
            top: 0,
        };

        // TODO:@Jocs calculate the position of the image in doc
        return {
            size: {
                width: imageWidth * scale,
                height: imageHeight * scale,
            },
            positionH: {
                relativeFrom: ObjectRelativeFromH.MARGIN,
                posOffset: position.left,
            },
            positionV: {
                relativeFrom: ObjectRelativeFromV.PAGE,
                posOffset: position.top,
            },
            angle: 0,
        };
    }

    private _updateOrderListener() {
        this._drawingManagerService.featurePluginOrderUpdate$.subscribe((params) => {
            const { unitId, subUnitId, drawingIds, arrangeType } = params;

            this._commandService.executeCommand(SetDocDrawingArrangeCommand.id, {
                unitId,
                subUnitId,
                drawingIds,
                arrangeType,
            } as ISetDrawingArrangeCommandParams);
        });
    }

    private _updateDrawingListener() {
        this._drawingManagerService.featurePluginUpdate$.subscribe((params) => {
            const drawings: Partial<IDocDrawing>[] = [];

            if (params.length === 0) {
                return;
            }

            // const offsetInfo = this._getDocsOffsetInfo();

            // const { pageMarginCache, docsLeft, docsTop } = offsetInfo;

            (params as IDocDrawing[]).forEach((param) => {
                const { unitId, subUnitId, drawingId, drawingType, transform } = param;
                if (transform == null) {
                    return;
                }

                const sheetDrawing = this._sheetDrawingService.getDrawingByParam({ unitId, subUnitId, drawingId });

                if (sheetDrawing == null) {
                    return;
                }

                // const { marginLeft, marginTop } = pageMarginCache.get(drawingId) || { marginLeft: 0, marginTop: 0 };

                const docTransform = transformToDocDrawingPosition({ ...sheetDrawing.transform, ...transform });

                if (docTransform == null) {
                    return;
                }

                const newDrawing: Partial<IDocDrawing> = {
                    ...param,
                    transform: { ...transform, ...docDrawingPositionToTransform(docTransform, this._textSelectionRenderManager) },
                    docTransform: { ...docTransform },
                };

                drawings.push(newDrawing);
            });

            if (drawings.length > 0) {
                this._commandService.syncExecuteCommand(SetDocDrawingCommand.id, {
                    unitId: params[0].unitId,
                    drawings,
                } as ISetDrawingCommandParams);

                this._refreshDocSkeleton();
            }
        });
    }

    private _getDocsOffsetInfo() {
        const docsSkeletonObject = this._docSkeletonManagerService.getCurrent();
        if (docsSkeletonObject == null) {
            return {
                pageMarginCache: new Map<string, { marginLeft: number; marginTop: number }>(),
                docsLeft: 0,
                docsTop: 0,
            };
        }

        const { unitId, skeleton } = docsSkeletonObject;

        const currentRender = this._renderManagerService.getRenderById(unitId);

        const skeletonData = skeleton?.getSkeletonData();

        if (currentRender == null || !skeletonData) {
            return {
                pageMarginCache: new Map<string, { marginLeft: number; marginTop: number }>(),
                docsLeft: 0,
                docsTop: 0,
            };
        }

        const { mainComponent } = currentRender;

        const documentComponent = mainComponent as Documents;

        const { left: docsLeft, top: docsTop, pageLayoutType, pageMarginLeft, pageMarginTop } = documentComponent;

        const { pages } = skeletonData;

        const liquid = new Liquid();

        const pageMarginCache = new Map<string, { marginLeft: number; marginTop: number }>();

        for (let i = 0, len = pages.length; i < len; i++) {
            const page = pages[i];
            const { skeDrawings, marginLeft, marginTop } = page;
            // cumPageLeft + = pageWidth + documents.pageMarginLeft;

            liquid.translatePagePadding(page);

            skeDrawings.forEach((drawing) => {
                const { aLeft, aTop, height, width, drawingId, drawingOrigin } = drawing;
                // const behindText = drawingOrigin.layoutType === PositionedObjectLayoutType.WRAP_NONE && drawingOrigin.behindDoc === BooleanNumber.TRUE;
                // floatObjects.push({
                //     unitId,
                //     subUnitId: DEFAULT_DOCUMENT_SUB_COMPONENT_ID,
                //     floatingObjectId: drawingId,
                //     behindText,
                //     floatingObject: {
                //         left: aLeft + docsLeft + liquid.x,
                //         top: aTop + docsTop + liquid.y,
                //         width,
                //         height,
                //     },
                // });

                pageMarginCache.set(drawingId, {
                    marginLeft: liquid.x,
                    marginTop: liquid.y,
                });
            });

            liquid.restorePagePadding(page);

            liquid.translatePage(page, pageLayoutType, pageMarginLeft, pageMarginTop);
        }

        return { pageMarginCache, docsLeft, docsTop };
    }

    private _refreshDocSkeleton() {
        const docsSkeletonObject = this._docSkeletonManagerService.getCurrent();
        if (docsSkeletonObject == null) {
            return;
        }

        const { unitId, skeleton } = docsSkeletonObject;

        const currentRender = this._renderManagerService.getRenderById(unitId);

        if (currentRender == null) {
            return;
        }

        const { mainComponent } = currentRender;

        skeleton?.calculate();

        mainComponent?.makeDirty();
    }

    private _groupDrawingListener() {
        this._drawingManagerService.featurePluginGroupUpdate$.subscribe((params) => {
            this._commandService.executeCommand(GroupDocDrawingCommand.id, params);
        });

        this._drawingManagerService.featurePluginUngroupUpdate$.subscribe((params) => {
            this._commandService.executeCommand(UngroupDocDrawingCommand.id, params);
        });
    }

    private _focusDrawingListener() {
        this.disposeWithMe(
            this._drawingManagerService.focus$.subscribe((params) => {
                if (params == null || params.length === 0) {
                    this._contextService.setContextValue(FOCUSING_COMMON_DRAWINGS, false);
                    this._sheetDrawingService.focusDrawing([]);
                } else {
                    this._contextService.setContextValue(FOCUSING_COMMON_DRAWINGS, true);
                    this._sheetDrawingService.focusDrawing(params);
                }
            })
        );
    }
}