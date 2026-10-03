//#include <iostream>
//#include "bitboard.h"
//#include "position.h"
#include "search.h"
#include "thread.h"
#include "tt.h"
#include "usi.h"
#include "misc.h"

#if defined(__EMSCRIPTEN__)
#include <emscripten.h>
#include <thread>
#endif

// ----------------------------------------
//  main()
// ----------------------------------------

namespace {

int engine_main(int argc, char* argv[])
{
	// --- 全体的な初期化

	CommandLine::init(argc,argv);
	USI::init(Options);
	Bitboards::init();
	Position::init();
	Search::init();

	// エンジンオプションの"Threads"があるとは限らないので…。
	size_t thread_num = Options.count("Threads") ? (size_t)Options["Threads"] : 1;
	Threads.set(thread_num);

	//Search::clear();
	Eval::init();

	// USIコマンドの応答部

	USI::loop(argc, argv);

	// 生成して、待機させていたスレッドの停止

	Threads.set(0);

	return 0;
}

} // namespace

#if !defined(__EMSCRIPTEN__)

int main(int argc, char* argv[])
{
	return engine_main(argc, argv);
}

#else

// ----------------------------------------
//  wasm 版 (ShogiHome の wasm エンジン ABI : shogihome-wasm-engine/1)
// ----------------------------------------

// JavaScript 側(wasm/shim.js)から USI コマンドを 1 行ずつ受け取る。
//
// コマンドは JavaScript のスレッドでは処理せず、専用の pthread で動く USI::loop()に渡す。
// JavaScript のスレッドを塞がないので、探索中も "stop" が届き、
// 探索スレッドの出力(Emscripten がこのスレッドへ代理で書き出す)も滞らない。
// main()は使わない(-sINVOKE_RUN=0)。初期化は最初のコマンドが届いたときに行う。
extern "C" EMSCRIPTEN_KEEPALIVE void usi_command(const char* line)
{
	static bool started = false;

	USI::push_command(line ? line : "");

	if (!started)
	{
		started = true;
		std::thread([] {
			static char argv0[] = "suisho-bm";
			char* argv[] = { argv0, nullptr };
			engine_main(1, argv);
		}).detach();
	}
}

#endif
