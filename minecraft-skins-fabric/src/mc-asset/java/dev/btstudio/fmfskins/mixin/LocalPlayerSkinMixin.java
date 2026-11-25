package dev.btstudio.fmfskins.mixin;

import dev.btstudio.fmfskins.SkinStore;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.network.AbstractClientPlayerEntity;
import net.minecraft.entity.player.PlayerSkinType;
import net.minecraft.entity.player.SkinTextures;
import net.minecraft.util.AssetInfo;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/** Local-only override; preserve the account cape and elytra. */
@Mixin(AbstractClientPlayerEntity.class)
public abstract class LocalPlayerSkinMixin {
    @Inject(method = "getSkin", at = @At("RETURN"), cancellable = true)
    private void fmf$skinTexture(CallbackInfoReturnable<SkinTextures> result) {
        MinecraftClient client = MinecraftClient.getInstance();
        if ((Object) this != client.player || SkinStore.texture() == null) return;
        SkinTextures old = result.getReturnValue();
        AssetInfo.TextureAsset body = new AssetInfo.TextureAssetInfo(SkinStore.texture(), SkinStore.texture());
        result.setReturnValue(new SkinTextures(body, old.cape(), old.elytra(),
                SkinStore.isSlim() ? PlayerSkinType.SLIM : PlayerSkinType.WIDE, old.secure()));
    }
}
