package dev.btstudio.fmfskins;

import net.minecraft.client.texture.NativeImage;
import net.minecraft.client.texture.NativeImageBackedTexture;

final class TextureFactory {
    private TextureFactory() {}
    static NativeImageBackedTexture create(NativeImage image) { return new NativeImageBackedTexture(image); }
}
