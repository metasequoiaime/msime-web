#!/bin/sh
# 水杉输入法 Linux 一键安装：curl -fsSL https://msime.app/install.sh | sh
#
# 识别发行版后添加 openSUSE Build Service 上的 home:msime 软件源和它的签名公钥，再用系统自带的包管理器安装 msime，最后替当前用户做首次配置；之后的更新随系统更新一起到来。不支持的发行版只打印说明，不改动系统。
set -eu

BASE=https://download.opensuse.org/repositories/home:/msime
DOWNLOAD_PAGE=https://msime.app/download/
# OBS 给 home:msime 的签名公钥。Arch 的公钥只按这个指纹本地信任，下载到的公钥对不上时 pacman 不会接受软件源。
ARCH_KEY_FINGERPRINT=F339A91A4C77008B49101BEFF9D283EB1137FF6B

say() { printf '%s\n' "$*"; }
fail() { printf 'msime: %s\n' "$*" >&2; exit 1; }

unsupported() {
	say "msime: $1"
	say "  其他发行版请到 $DOWNLOAD_PAGE 下载安装包（.deb、.rpm 或 .tar.gz）。"
	exit 1
}

# 整个流程放在函数里、最后一行才调用：经管道执行时 sh 先读完整个脚本再动手，下载中断不会只执行半截，中途读标准输入的命令也吃不到后面的脚本。
main() {
	if [ "$(id -u)" -eq 0 ]; then
		SUDO=
	elif command -v sudo >/dev/null 2>&1; then
		SUDO=sudo
	else
		fail "需要 root 权限：请用 root 运行，或先安装 sudo。"
	fi

	command -v curl >/dev/null 2>&1 || fail "需要 curl。"
	[ -r /etc/os-release ] || unsupported "读不到 /etc/os-release，无法识别发行版。"
	# shellcheck source=/dev/null
	. /etc/os-release

	ID=${ID:-}
	VERSION_ID=${VERSION_ID:-}
	ARCH=$(uname -m)

	# Ubuntu 衍生版（Linux Mint、Pop!_OS、elementary 等）按它们基于的 Ubuntu 版本找源。
	ubuntu_release() {
		case "${UBUNTU_CODENAME:-}" in
			noble) echo 24.04 ;;
			resolute) echo 26.04 ;;
			*) echo ;;
		esac
	}

	REPO=
	FAMILY=
	case "$ID" in
		fedora)
			case "$VERSION_ID" in
				43 | 44) REPO=Fedora_$VERSION_ID FAMILY=dnf ;;
				*) unsupported "暂不支持 Fedora $VERSION_ID，软件源提供 Fedora 43 与 44。" ;;
			esac
			;;
		opensuse-tumbleweed | opensuse-slowroll)
			REPO=openSUSE_Tumbleweed FAMILY=zypper
			;;
		opensuse-leap)
			unsupported "软件源暂不提供 openSUSE Leap，Tumbleweed 可以直接安装。"
			;;
		ubuntu)
			case "$VERSION_ID" in
				24.04 | 26.04) REPO=xUbuntu_$VERSION_ID FAMILY=apt ;;
				*) unsupported "暂不支持 Ubuntu $VERSION_ID，软件源提供 Ubuntu 24.04 与 26.04。" ;;
			esac
			;;
		debian)
			# testing 与 unstable 的 os-release 都没有 VERSION_ID，也共用同一个代号；只有 apt 的源配置能分开它们。
			if [ -n "$VERSION_ID" ]; then
				unsupported "Debian $VERSION_ID 的 Rust 版本过旧，软件源只提供 Debian testing 与 unstable。"
			elif grep -qsE '(^|[[:space:]])(sid|unstable)([[:space:]]|$)' /etc/apt/sources.list /etc/apt/sources.list.d/*; then
				REPO=Debian_Unstable FAMILY=apt
			else
				REPO=Debian_Testing FAMILY=apt
			fi
			;;
		arch)
			REPO=Arch FAMILY=pacman
			;;
		*)
			release=$(ubuntu_release)
			if [ -n "$release" ]; then
				REPO=xUbuntu_$release FAMILY=apt
			elif case " ${ID_LIKE:-} " in *" arch "*) true ;; *) false ;; esac; then
				# Omarchy 沿用 Arch 的 ID=arch；EndeavourOS、CachyOS 等在 ID_LIKE 里写着 arch。
				REPO=Arch FAMILY=pacman
			else
				unsupported "暂不支持这个发行版（${PRETTY_NAME:-$ID}）。"
			fi
			;;
	esac

	# 只有 Fedora 同时提供 aarch64；其余源目前只有 x86_64。先确认源里真有这个架构的包，再动系统配置。
	case "$FAMILY:$ARCH" in
		dnf:x86_64 | dnf:aarch64 | zypper:x86_64 | pacman:x86_64) arch_dir=$ARCH ;;
		apt:x86_64) arch_dir=amd64 ;;
		*) unsupported "$REPO 的软件源暂不提供 $ARCH 架构的包。" ;;
	esac
	curl -fsI "$BASE/$REPO/$arch_dir/" >/dev/null 2>&1 || fail "访问不到软件源 $BASE/$REPO/，请检查网络后重试。"

	say "msime: 使用软件源 $BASE/$REPO/"
	case "$FAMILY" in
		dnf)
			$SUDO rpm --import "$BASE/$REPO/repodata/repomd.xml.key"
			curl -fsSL "$BASE/$REPO/home:msime.repo" | $SUDO tee /etc/yum.repos.d/home:msime.repo >/dev/null
			$SUDO dnf install -y msime
			;;
		zypper)
			$SUDO rpm --import "$BASE/$REPO/repodata/repomd.xml.key"
			if ! zypper lr home_msime >/dev/null 2>&1; then
				$SUDO zypper --non-interactive addrepo --refresh "$BASE/$REPO/home:msime.repo"
			fi
			$SUDO zypper --non-interactive install msime
			;;
		pacman)
			curl -fsSL "$BASE/$REPO/x86_64/home_msime_Arch.key" | $SUDO pacman-key --add -
			$SUDO pacman-key --lsign-key "$ARCH_KEY_FINGERPRINT"
			if ! grep -q '^\[home_msime_Arch\]' /etc/pacman.conf; then
				# shellcheck disable=SC2016 # $arch 是给 pacman 展开的变量
				printf '\n[home_msime_Arch]\nServer = %s/%s/$arch\n' "$BASE" "$REPO" | $SUDO tee -a /etc/pacman.conf >/dev/null
			fi
			# Arch 不支持只刷新数据库不升级的部分升级，所以与系统一起 -Syu。
			$SUDO pacman -Syu --noconfirm --needed msime-bin
			;;
		apt)
			$SUDO install -d -m 0755 /etc/apt/keyrings
			curl -fsSL "$BASE/$REPO/Release.key" | $SUDO tee /etc/apt/keyrings/msime.asc >/dev/null
			echo "deb [signed-by=/etc/apt/keyrings/msime.asc] $BASE/$REPO/ /" | $SUDO tee /etc/apt/sources.list.d/msime.list >/dev/null
			$SUDO apt-get update
			$SUDO env DEBIAN_FRONTEND=noninteractive apt-get install -y msime
			;;
	esac

	# 主词库不随包，每个用户首次使用前要运行一次 msime-linux-setup --download：它下载并校验词库、建立用户状态，再把输入法加进正在运行的 Fcitx5 或 IBus。以 root 运行本脚本时不知道是给哪个用户装的，只打印这一步。
	say ""
	if [ -z "$SUDO" ]; then
		say "msime: 安装完成。请以要使用输入法的用户身份运行一次："
		say "  msime-linux-setup --download"
	elif [ -e "${XDG_CONFIG_HOME:-$HOME/.config}/msime-client/runtime-options.json" ]; then
		say "msime: 安装完成。这个用户已经配置过，可以直接使用。"
	else
		say "msime: 安装完成，开始首次配置（下载词库）……"
		# msime 0.10.0 的 msime-linux-prepare 不会创建缺失的上级目录，没登录过桌面的新用户连 ~/.config 都没有；新版本已修复（msime#3808），这里先建好，旧版本也能配置。
		mkdir -p "${XDG_CONFIG_HOME:-$HOME/.config}"
		msime-linux-setup --download
	fi
}

main "$@"
